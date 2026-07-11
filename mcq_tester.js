// mcq_tester.js - Apple-Inspired Logic Engine for KHOSA Practice Lab

// --- State Management ---
let catalogData = null;       // Subjects and topics catalog registry
let quizData = [];           // Current active quiz questions list
let originalQuizData = [];   // Unfiltered quiz questions list (for retries)
let currentTopicId = '';     // Topic identifier
let currentTopicName = '';   // Topic title
let quizMode = 'study';      // 'study' or 'exam'
let timerDuration = 0;       // Selected timer duration in seconds (0 = unlimited)
let timerInterval = null;    // Timer loop reference
let timeElapsed = 0;         // Seconds spent in current practice run
let timeLeft = 0;            // Countdown seconds remaining (for exam mode)
let currentIndex = 0;        // Current question index (0-based)
let userAnswers = [];        // User selections (indices, null for unanswered)
let bookmarkedStates = [];   // Boolean flags for bookmarked questions
let incorrectOnlyMode = false; // Retesting only wrong answers
let filteredIndicesMap = []; // Maps filtered indices to original indices

// --- DOM Elements Cache ---
const views = {
    dashboard: document.getElementById('dashboard-view'),
    quiz: document.getElementById('quiz-view'),
    results: document.getElementById('results-view')
};

// UI Widgets
const navbarTopicTitle = document.getElementById('navbar-topic-title');
const subjectsContainer = document.getElementById('subjects-container');
const timerDisplay = document.getElementById('timer-display');
const timerValue = document.getElementById('timer-value');
const bookmarkCountEl = document.getElementById('bookmark-count');
const modePillDisplay = document.getElementById('mode-pill-display');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const currentQNum = document.getElementById('current-q-num');
const totalQNum = document.getElementById('total-q-num');
const qNavGrid = document.getElementById('question-nav-grid');

// Question Display Cards
const bookmarkToggle = document.getElementById('bookmark-toggle');
const questionText = document.getElementById('question-text');
const hintContainer = document.getElementById('hint-container');
const hintToggleBtn = document.getElementById('hint-toggle-btn');
const hintContent = document.getElementById('hint-content');
const hintText = document.getElementById('hint-text');
const optionsContainer = document.getElementById('options-container');
const rationaleCard = document.getElementById('rationale-card');
const rationaleText = document.getElementById('rationale-text');
const feedbackBadge = document.getElementById('feedback-badge');

// Navigation Buttons
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitExamBtn = document.getElementById('submit-exam-btn');
const quitTestBtn = document.getElementById('quit-test-btn');

// Results Widgets
const scorePercent = document.getElementById('score-percent');
const scoreFraction = document.getElementById('score-fraction');
const gaugeCircle = document.getElementById('gauge-circle');
const scoreBadgeEarned = document.getElementById('score-badge-earned');
const metricTopic = document.getElementById('metric-topic');
const metricMode = document.getElementById('metric-mode');
const metricTime = document.getElementById('metric-time');
const metricAccuracy = document.getElementById('metric-accuracy');
const metricAttempted = document.getElementById('metric-attempted');
const metricBookmarks = document.getElementById('metric-bookmarks');
const reviewQuestionsList = document.getElementById('review-questions-list');

// Results Action Buttons
const retestAllBtn = document.getElementById('retest-all-btn');
const retestIncorrectBtn = document.getElementById('retest-incorrect-btn');
const backDashBtn = document.getElementById('back-dash-btn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Set current date in navbar status
    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    document.getElementById('header-date').innerText = new Date().toLocaleDateString('en-US', dateOptions);

    // Initial catalog load
    loadCatalog();
    setupEventListeners();
});

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Mode toggle pill controllers
    const modeStudy = document.getElementById('mode-study-label');
    const modeExam = document.getElementById('mode-exam-label');
    const timerBox = document.getElementById('timer-settings-box');
    
    document.getElementsByName('quiz-mode').forEach(radio => {
        radio.addEventListener('change', (e) => {
            quizMode = e.target.value;
            if (quizMode === 'study') {
                modeStudy.classList.add('active');
                modeExam.classList.remove('active');
                timerBox.style.opacity = '0.4';
                timerBox.style.pointerEvents = 'none';
            } else {
                modeStudy.classList.remove('active');
                modeExam.classList.add('active');
                timerBox.style.opacity = '1';
                timerBox.style.pointerEvents = 'auto';
            }
        });
    });

    // Disable timer selection initially since study mode is checked by default
    timerBox.style.opacity = '0.4';
    timerBox.style.pointerEvents = 'none';

    // Timer Preset Buttons click
    document.querySelectorAll('.timer-pill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.timer-pill-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            timerDuration = parseInt(e.target.dataset.time, 10);
        });
    });

    // Quiz Navigation Buttons
    prevBtn.addEventListener('click', () => navigateQuestion(currentIndex - 1));
    nextBtn.addEventListener('click', () => {
        if (currentIndex < quizData.length - 1) {
            navigateQuestion(currentIndex + 1);
        } else if (quizMode === 'study') {
            // In study mode, clicking next on final question submits results
            finishQuiz();
        }
    });

    submitExamBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to finish the exam and view results?")) {
            finishQuiz();
        }
    });

    bookmarkToggle.addEventListener('click', toggleBookmark);
    quitTestBtn.addEventListener('click', confirmQuit);

    // Hint Toggle
    hintToggleBtn.addEventListener('click', () => {
        hintContainer.classList.toggle('open');
    });

    // Results Actions
    retestAllBtn.addEventListener('click', retestAll);
    retestIncorrectBtn.addEventListener('click', retestIncorrectOnly);
    backDashBtn.addEventListener('click', () => {
        navbarTopicTitle.innerText = "Subject Directory";
        switchView('dashboard');
        loadCatalog(); // Refresh scores on return
    });

    // Review Filters
    document.querySelectorAll('.segment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderReviewQuestionsList(e.target.dataset.filter);
        });
    });
}

// --- View Switcher ---
function switchView(viewName) {
    Object.keys(views).forEach(key => {
        if (key === viewName) {
            views[key].classList.add('active');
        } else {
            views[key].classList.remove('active');
        }
    });
    // Scroll window back to top on transitions
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Fetch Catalog Registry ---
async function loadCatalog() {
    try {
        const response = await fetch('mcqs/quizzes.json');
        if (!response.ok) throw new Error("Failed to fetch quizzes registry");
        catalogData = await response.json();
        renderDashboardCatalog();
    } catch (err) {
        console.error(err);
        subjectsContainer.innerHTML = `
            <div class="catalog-loading" style="color: var(--error-red);">
                ⚠️ Error loading subjects index registry. Ensure 'mcqs/quizzes.json' exists.
            </div>
        `;
    }
}

// --- Render Subject Directory in Apple.com List Style ---
function renderDashboardCatalog() {
    if (!catalogData || !catalogData.subjects) return;
    
    subjectsContainer.innerHTML = '';
    
    catalogData.subjects.forEach((subject, subIndex) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'subject-wrapper';
        
        // Auto-expand first subject
        if (subIndex === 0) wrapper.classList.add('expanded');

        const headerBtn = document.createElement('button');
        headerBtn.className = 'subject-accordion-btn';
        headerBtn.type = 'button';
        headerBtn.innerHTML = `
            <h4>📖 ${subject.name}</h4>
            <span class="chevron">▶</span>
        `;
        headerBtn.addEventListener('click', () => {
            wrapper.classList.toggle('expanded');
        });

        const topicsList = document.createElement('div');
        topicsList.className = 'subject-topics-list';

        // Render topics as vertical rows in list format
        subject.topics.forEach(topic => {
            const topicRow = document.createElement('div');
            topicRow.className = 'topic-list-row';
            
            // Retrieve high score from localStorage
            const localKey = `khosa_mcq_highscore_${topic.id}`;
            const localDataStr = localStorage.getItem(localKey);
            let scoreMetaHtml = '';
            if (localDataStr) {
                const meta = JSON.parse(localDataStr);
                scoreMetaHtml = `<span class="badge-pill badge-blue">${meta.score}/${meta.total} (${meta.percent}%)</span>`;
            }

            topicRow.innerHTML = `
                <div class="topic-info-side">
                    <h5 class="topic-row-title">${topic.name}</h5>
                    <p class="topic-row-desc">${topic.description}</p>
                </div>
                <div class="topic-badges-side">
                    <span class="badge-pill badge-gray">${topic.questionCount} Qs</span>
                    ${scoreMetaHtml}
                    <span class="list-chevron">›</span>
                </div>
            `;

            topicRow.addEventListener('click', () => {
                loadQuizFromPath(topic.path, topic.id, topic.name);
            });

            topicsList.appendChild(topicRow);
        });

        wrapper.appendChild(headerBtn);
        wrapper.appendChild(topicsList);
        subjectsContainer.appendChild(wrapper);
    });
}

// --- Load Quiz JSON ---
async function loadQuizFromPath(path, topicId, topicName) {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load quiz from ${path}`);
        const data = await response.json();
        
        currentTopicId = topicId;
        currentTopicName = topicName;
        incorrectOnlyMode = false;
        
        startQuiz(data);
    } catch (err) {
        console.error(err);
        alert(`Failed to load the quiz file: ${err.message}`);
    }
}

// --- Start Quiz Runtime ---
function startQuiz(questions) {
    quizData = [...questions];
    
    if (!incorrectOnlyMode) {
        originalQuizData = [...questions];
        // Create 1-to-1 map of indices
        filteredIndicesMap = quizData.map((_, i) => i);
    }

    // Set topic name in top navbar
    navbarTopicTitle.innerText = currentTopicName;

    // Reset status trackers
    currentIndex = 0;
    userAnswers = new Array(quizData.length).fill(null);
    bookmarkedStates = new Array(quizData.length).fill(false);
    
    // Clear and start timers
    clearInterval(timerInterval);
    timeElapsed = 0;
    
    if (quizMode === 'exam') {
        modePillDisplay.innerText = "Exam Mode";
        modePillDisplay.className = "stat-pill mode-badge";
        
        if (timerDuration > 0) {
            // Calculate exam limit (either per-question preset or absolute total)
            if (timerDuration === 30 || timerDuration === 60) {
                timeLeft = quizData.length * timerDuration;
            } else {
                timeLeft = timerDuration;
            }
            startExamCountdown();
        } else {
            timeLeft = 0;
            timerValue.innerText = "Unlimited";
            startStopwatch();
        }
    } else {
        // Study Mode stopwatch
        modePillDisplay.innerText = "Study Mode";
        modePillDisplay.className = "stat-pill mode-badge";
        timerValue.innerText = "00:00";
        timeLeft = 0;
        startStopwatch();
    }

    // Sync UI elements counts
    totalQNum.innerText = quizData.length;
    bookmarkCountEl.innerText = "0";

    // Build question nav numbers matrix
    renderNavGrid();
    
    // View Switch and render first question
    switchView('quiz');
    showQuestion(0);
}

// --- Nav Grid Cells Map ---
function renderNavGrid() {
    qNavGrid.innerHTML = '';
    quizData.forEach((_, idx) => {
        const navBtn = document.createElement('button');
        navBtn.className = 'q-matrix-btn';
        navBtn.innerText = idx + 1;
        navBtn.title = `Jump to Question ${idx + 1}`;
        navBtn.addEventListener('click', () => navigateQuestion(idx));
        qNavGrid.appendChild(navBtn);
    });
}

function updateNavGridButtons() {
    const btns = qNavGrid.querySelectorAll('.q-matrix-btn');
    btns.forEach((btn, idx) => {
        // Clear status classes
        btn.className = 'q-matrix-btn';
        
        if (idx === currentIndex) {
            btn.classList.add('current');
            // Automatically scroll the current active button into view in the slider
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        
        if (userAnswers[idx] !== null) {
            if (quizMode === 'study') {
                // Color code based on correctness in Study Mode
                const isCorrect = quizData[idx].options[userAnswers[idx]].isCorrect;
                btn.classList.add(isCorrect ? 'correct-ans' : 'wrong-ans');
            } else {
                // Simple answered marker in Exam Mode
                btn.classList.add('answered');
            }
        }
        
        if (bookmarkedStates[idx]) {
            btn.classList.add('bookmarked');
        }
    });
}

// --- Timers Setup ---
function startStopwatch() {
    timerDisplay.className = "stat-pill timer-badge";
    timerInterval = setInterval(() => {
        timeElapsed++;
        const mins = Math.floor(timeElapsed / 60).toString().padStart(2, '0');
        const secs = (timeElapsed % 60).toString().padStart(2, '0');
        timerValue.innerText = `${mins}:${secs}`;
    }, 1000);
}

function startExamCountdown() {
    timerDisplay.className = "stat-pill timer-badge";
    
    const updateCountdownUI = () => {
        const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const secs = (timeLeft % 60).toString().padStart(2, '0');
        timerValue.innerText = `${mins}:${secs}`;
        
        // Timer warnings
        if (timeLeft <= 10) {
            timerDisplay.className = "stat-pill timer-badge critical-timer";
        } else if (timeLeft <= 60) {
            timerDisplay.className = "stat-pill timer-badge warning-timer";
        }
    };
    
    updateCountdownUI();
    
    timerInterval = setInterval(() => {
        timeElapsed++;
        timeLeft--;
        updateCountdownUI();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⏰ Time's up! The exam is submitting automatically.");
            finishQuiz();
        }
    }, 1000);
}

// --- Question Renderer ---
function showQuestion(index) {
    currentIndex = index;
    currentQNum.innerText = index + 1;
    
    // Update progress bar width
    const progress = Math.round(((index + 1) / quizData.length) * 100);
    progressBar.style.width = `${progress}%`;
    progressPercentage.innerText = `${progress}% Complete`;

    const q = quizData[index];
    
    // Set Question Text
    questionText.innerText = q.question;
    
    // Hint setup
    hintContainer.classList.remove('open');
    if (q.hint && q.hint.trim() !== '') {
        hintContainer.style.display = 'block';
        hintText.innerText = q.hint;
    } else {
        hintContainer.style.display = 'none';
    }

    // Bookmark/Starred button sync
    if (bookmarkedStates[index]) {
        bookmarkToggle.classList.add('active');
        bookmarkToggle.innerHTML = `<span class="star-shape">★</span> Starred`;
    } else {
        bookmarkToggle.classList.remove('active');
        bookmarkToggle.innerHTML = `<span class="star-shape">☆</span> Star`;
    }

    // Clean dynamic options
    optionsContainer.innerHTML = '';
    rationaleCard.style.display = 'none';
    
    q.options.forEach((opt, optIdx) => {
        const btn = document.createElement('button');
        btn.className = 'option-row-btn';
        btn.type = 'button';
        btn.innerHTML = `<span>${opt.text}</span>`;
        
        // Sync states if already answered
        const answeredIndex = userAnswers[index];
        const hasBeenAnswered = answeredIndex !== null;

        if (quizMode === 'study') {
            if (hasBeenAnswered) {
                btn.disabled = true;
                if (opt.isCorrect) {
                    btn.classList.add('correct-choice');
                } else if (optIdx === answeredIndex) {
                    btn.classList.add('wrong-choice');
                }
            } else {
                btn.addEventListener('click', () => selectOptionStudy(optIdx));
            }
        } else {
            // Exam Mode: select toggle
            if (hasBeenAnswered && optIdx === answeredIndex) {
                btn.classList.add('selected');
            }
            btn.addEventListener('click', () => selectOptionExam(optIdx));
        }

        optionsContainer.appendChild(btn);
    });

    // Show rationale immediately in study mode if already answered
    if (quizMode === 'study' && userAnswers[index] !== null) {
        revealRationale(index);
    }

    // Nav footer controls sync
    prevBtn.disabled = index === 0;
    
    if (index === quizData.length - 1) {
        if (quizMode === 'exam') {
            nextBtn.style.display = 'none';
            submitExamBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            nextBtn.innerText = "Finish Quiz";
        }
    } else {
        nextBtn.style.display = 'block';
        nextBtn.innerText = "Next Question";
        submitExamBtn.style.display = 'none';
    }

    updateNavGridButtons();
}

// --- Action Handlers ---
function navigateQuestion(index) {
    if (index >= 0 && index < quizData.length) {
        showQuestion(index);
    }
}

// Study mode option click handler
function selectOptionStudy(optionIndex) {
    userAnswers[currentIndex] = optionIndex;
    
    // Disable all options immediately
    const btns = optionsContainer.querySelectorAll('.option-row-btn');
    btns.forEach((btn, idx) => {
        btn.disabled = true;
        const isCorrect = quizData[currentIndex].options[idx].isCorrect;
        if (isCorrect) {
            btn.classList.add('correct-choice');
        } else if (idx === optionIndex) {
            btn.classList.add('wrong-choice');
        }
    });

    revealRationale(currentIndex);
    updateNavGridButtons();
}

// Exam mode option click handler (allows toggling/switching answers)
function selectOptionExam(optionIndex) {
    userAnswers[currentIndex] = optionIndex;
    
    const btns = optionsContainer.querySelectorAll('.option-row-btn');
    btns.forEach((btn, idx) => {
        if (idx === optionIndex) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    
    updateNavGridButtons();
}

// Rationale renderer
function revealRationale(index) {
    const q = quizData[index];
    const userSelectedIdx = userAnswers[index];
    const selectedOpt = q.options[userSelectedIdx];
    
    rationaleCard.style.display = 'block';
    
    if (selectedOpt.isCorrect) {
        rationaleCard.className = "explanation-panel"; // green layout
        feedbackBadge.innerText = "Correct";
        feedbackBadge.className = "result-badge badge-success";
        rationaleText.innerText = selectedOpt.rationale || "Great job! That is the correct option.";
    } else {
        rationaleCard.className = "explanation-panel wrong-explanation"; // red layout
        feedbackBadge.innerText = "Incorrect";
        feedbackBadge.className = "result-badge badge-error";
        
        // Build rationale: show why selected was wrong, followed by correct rationale
        const correctOpt = q.options.find(o => o.isCorrect);
        let content = `Your choice was incorrect. ${selectedOpt.rationale || ''}<br><br>`;
        content += `<strong>Correct Answer:</strong> ${correctOpt.text}<br>`;
        content += `${correctOpt.rationale || ''}`;
        rationaleText.innerHTML = content;
    }
}

function toggleBookmark() {
    bookmarkedStates[currentIndex] = !bookmarkedStates[currentIndex];
    
    // Count bookmarks
    const totalBookmarks = bookmarkedStates.filter(Boolean).length;
    bookmarkCountEl.innerText = totalBookmarks;
    
    // Sync current button UI
    if (bookmarkedStates[currentIndex]) {
        bookmarkToggle.classList.add('active');
        bookmarkToggle.innerHTML = `<span class="star-shape">★</span> Starred`;
    } else {
        bookmarkToggle.classList.remove('active');
        bookmarkToggle.innerHTML = `<span class="star-shape">☆</span> Star`;
    }
    
    updateNavGridButtons();
}

function confirmQuit() {
    clearInterval(timerInterval);
    navbarTopicTitle.innerText = "Subject Directory";
    switchView('dashboard');
    loadCatalog();
}

// --- Finish Quiz & Render Results Dashboard ---
function finishQuiz() {
    clearInterval(timerInterval);
    
    // Calculate results metrics
    let correctCount = 0;
    let attemptedCount = 0;
    
    userAnswers.forEach((ans, idx) => {
        if (ans !== null) {
            attemptedCount++;
            if (quizData[idx].options[ans].isCorrect) {
                correctCount++;
            }
        }
    });

    const totalQuestions = quizData.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    // Display score text percentages
    scorePercent.innerText = `${percentage}%`;
    scoreFraction.innerText = `${correctCount} / ${totalQuestions} Correct`;

    // Conic gradient on SVG gauge circle
    gaugeCircle.style.background = `conic-gradient(var(--accent-blue) ${percentage * 3.6}deg, #e8e8ed 0deg)`;

    // Assign performance badges
    let badgeText = "Revision Needed ☕";
    if (percentage === 100) {
        badgeText = "Perfect Score! 🏆";
    } else if (percentage >= 85) {
        badgeText = "Aspirant Excellence 🌟";
    } else if (percentage >= 70) {
        badgeText = "Topic Scholar 📚";
    } else if (percentage >= 50) {
        badgeText = "Progressing Well 👍";
    }
    scoreBadgeEarned.innerText = badgeText;

    // Time formatting
    const finalMins = Math.floor(timeElapsed / 60);
    const finalSecs = timeElapsed % 60;
    const timeTakenStr = `${finalMins}m ${finalSecs}s`;

    // Metrics table row updates
    metricTopic.innerText = currentTopicName;
    metricMode.innerText = quizMode === 'study' ? "Study Mode" : "Exam Mode";
    metricTime.innerText = timeTakenStr;
    metricAccuracy.innerText = `${percentage}%`;
    metricAttempted.innerText = `${attemptedCount} of ${totalQuestions}`;
    metricBookmarks.innerText = bookmarkedStates.filter(Boolean).length;

    // Save to localStorage if not in retest-incorrect-only mode
    if (!incorrectOnlyMode) {
        const localKey = `khosa_mcq_highscore_${currentTopicId}`;
        const previousRecordStr = localStorage.getItem(localKey);
        let saveRecord = true;
        
        if (previousRecordStr) {
            const prev = JSON.parse(previousRecordStr);
            if (prev.score >= correctCount) {
                saveRecord = false; // retain old score if higher or equal
            }
        }
        
        if (saveRecord) {
            localStorage.setItem(localKey, JSON.stringify({
                score: correctCount,
                total: totalQuestions,
                percent: percentage,
                date: new Date().toISOString()
            }));
        }
    }

    // Toggle Retry incorrect button availability
    if (correctCount === totalQuestions) {
        retestIncorrectBtn.disabled = true;
        retestIncorrectBtn.style.opacity = '0.4';
    } else {
        retestIncorrectBtn.disabled = false;
        retestIncorrectBtn.style.opacity = '1';
    }

    // Toggle review list active segments filter and run list render
    document.querySelectorAll('.segment-btn').forEach(b => {
        b.classList.remove('active');
        if (b.dataset.filter === 'all') b.classList.add('active');
    });
    
    renderReviewQuestionsList('all');
    switchView('results');
}

// --- Renders Review Cards & Filtering ---
function renderReviewQuestionsList(filterMode) {
    reviewQuestionsList.innerHTML = '';

    // Calculate count totals for segment indicator tags
    let allCnt = quizData.length;
    let correctCnt = 0;
    let incorrectCnt = 0;
    let bookmarkedCnt = 0;

    const itemsToRender = [];

    quizData.forEach((q, idx) => {
        const userSelection = userAnswers[idx];
        const isBookmarked = bookmarkedStates[idx];
        
        let status = 'unanswered';
        let isCorrect = false;
        
        if (userSelection !== null) {
            isCorrect = q.options[userSelection].isCorrect;
            status = isCorrect ? 'correct' : 'incorrect';
            if (isCorrect) correctCnt++; else incorrectCnt++;
        } else {
            incorrectCnt++; // unanswered items count as incorrect
        }
        
        if (isBookmarked) bookmarkedCnt++;

        // Filter checks
        let matchesFilter = false;
        if (filterMode === 'all') matchesFilter = true;
        else if (filterMode === 'correct' && status === 'correct') matchesFilter = true;
        else if (filterMode === 'incorrect' && (status === 'incorrect' || status === 'unanswered')) matchesFilter = true;
        else if (filterMode === 'bookmarked' && isBookmarked) matchesFilter = true;

        if (matchesFilter) {
            itemsToRender.push({ q, idx, status, userSelection, isBookmarked });
        }
    });

    // Update segment buttons counters
    document.getElementById('filter-cnt-all').innerText = allCnt;
    document.getElementById('filter-cnt-correct').innerText = correctCnt;
    document.getElementById('filter-cnt-incorrect').innerText = incorrectCnt;
    document.getElementById('filter-cnt-bookmarked').innerText = bookmarkedCnt;

    if (itemsToRender.length === 0) {
        reviewQuestionsList.innerHTML = `<div class="catalog-loading">No questions match this review filter.</div>`;
        return;
    }

    // Build html review rows
    itemsToRender.forEach(item => {
        const itemCard = document.createElement('div');
        let borderClass = 'unanswered-item-border';
        if (item.status === 'correct') borderClass = 'correct-item-border';
        if (item.status === 'incorrect') borderClass = 'wrong-item-border';
        
        itemCard.className = `review-item-card ${borderClass}`;

        let starredIcon = item.isBookmarked ? `<span class="starred-review-icon" title="Starred">★</span>` : '';

        // Options lists
        let optionsHtml = '';
        item.q.options.forEach((opt, optIdx) => {
            let optionClass = '';
            if (opt.isCorrect) {
                optionClass = item.userSelection === optIdx ? 'selected-correct-row' : 'correct-row';
            } else if (item.userSelection === optIdx) {
                optionClass = 'wrong-row';
            }

            optionsHtml += `
                <div class="review-option-row ${optionClass}">
                    <span>${opt.text}</span>
                </div>
            `;
        });

        // Rationale text explanation markup
        const correctOption = item.q.options.find(o => o.isCorrect);
        let userSelectTextHtml = '';
        if (item.userSelection !== null && !item.q.options[item.userSelection].isCorrect) {
            userSelectTextHtml = `Your choice was incorrect: "${item.q.options[item.userSelection].text}". ${item.q.options[item.userSelection].rationale || ''}<br><br>`;
        }

        itemCard.innerHTML = `
            ${starredIcon}
            <div class="review-q-header">
                <span class="review-q-prefix">Q${item.idx + 1}.</span>
                <h4 class="review-q-text">${item.q.question}</h4>
            </div>
            <div class="review-options-column">
                ${optionsHtml}
            </div>
            <div class="review-explanation-text">
                ${userSelectTextHtml}
                <strong>Explanation:</strong> ${correctOption.rationale || 'No explanation provided.'}
            </div>
        `;

        reviewQuestionsList.appendChild(itemCard);
    });
}

// --- Retest Execution Blocks ---
function retestAll() {
    incorrectOnlyMode = false;
    startQuiz(originalQuizData);
}

function retestIncorrectOnly() {
    const wrongQuestions = [];
    const newIndicesMap = [];

    userAnswers.forEach((ans, idx) => {
        const isWrong = ans === null || !quizData[idx].options[ans].isCorrect;
        if (isWrong) {
            wrongQuestions.push(quizData[idx]);
            newIndicesMap.push(filteredIndicesMap[idx]);
        }
    });

    if (wrongQuestions.length === 0) {
        alert("Perfect score! No incorrect answers to retest.");
        return;
    }

    incorrectOnlyMode = true;
    filteredIndicesMap = newIndicesMap;
    startQuiz(wrongQuestions);
}
