// mcq_tester.js - Apple-Inspired Logic Engine for KHOSA Practice Lab

// --- State Management ---
let catalogData = null;       // Subjects and topics catalog registry
let quizData = [];           // Current active quiz questions list
let originalQuizData = [];   // Unfiltered quiz questions list (for retries)
let currentTopicId = '';     // Topic identifier
let currentTopicName = '';   // Topic title
let currentIndex = 0;        // Current question index (0-based)
let userAnswers = [];        // User selections (indices, null for unanswered)
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
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const currentQNum = document.getElementById('current-q-num');
const totalQNum = document.getElementById('total-q-num');
const qNavGrid = document.getElementById('question-nav-grid');

// Question Display Cards
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
const quitTestBtn = document.getElementById('quit-test-btn');

// Results Widgets
const scorePercent = document.getElementById('score-percent');
const scoreFraction = document.getElementById('score-fraction');
const gaugeCircle = document.getElementById('gauge-circle');
const scoreBadgeEarned = document.getElementById('score-badge-earned');
const metricTopic = document.getElementById('metric-topic');
const metricAccuracy = document.getElementById('metric-accuracy');
const metricAttempted = document.getElementById('metric-attempted');
const reviewQuestionsList = document.getElementById('review-questions-list');

// Results Action Buttons
const retestAllBtn = document.getElementById('retest-all-btn');
const retestIncorrectBtn = document.getElementById('retest-incorrect-btn');
const backDashBtn = document.getElementById('back-dash-btn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const headerDate = document.getElementById('header-date');
    if (headerDate) {
        const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        headerDate.innerText = new Date().toLocaleDateString('en-US', dateOptions);
    }

    // Initial catalog load
    loadCatalog();
    setupEventListeners();
});

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Quiz Navigation Buttons
    prevBtn.addEventListener('click', () => navigateQuestion(currentIndex - 1));
    nextBtn.addEventListener('click', () => {
        if (currentIndex < quizData.length - 1) {
            navigateQuestion(currentIndex + 1);
        } else {
            // In study mode, clicking next on final question submits results
            finishQuiz();
        }
    });

    quitTestBtn.addEventListener('click', confirmQuit);

    // Hint Toggle
    hintToggleBtn.addEventListener('click', () => {
        hintContainer.classList.toggle('open');
    });

    // Results Actions
    retestAllBtn.addEventListener('click', retestAll);
    retestIncorrectBtn.addEventListener('click', retestIncorrectOnly);
    backDashBtn.addEventListener('click', () => {
        if (navbarTopicTitle) navbarTopicTitle.innerText = "Subject Directory";
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
        
        // Auto-expand Indian Polity by default
        if (subject.id === 'polity') wrapper.classList.add('expanded');

        const headerBtn = document.createElement('button');
        headerBtn.className = 'subject-accordion-btn';
        headerBtn.type = 'button';
        
        let badgeHtml = '';
        let chevronHtml = '<span class="chevron">▶</span>';
        if (subject.id !== 'polity') {
            badgeHtml = `<span class="badge-pill badge-gray" style="margin-left: 8px; font-size: 11px; font-weight: 500;">Coming Soon</span>`;
            chevronHtml = ''; // No chevron for locked coming soon subjects
            headerBtn.classList.add('disabled-accordion');
        }

        headerBtn.innerHTML = `
            <h4 style="display: flex; align-items: center;">📖 ${subject.name} ${badgeHtml}</h4>
            ${chevronHtml}
        `;
        
        // Only allow toggling/expansion for active subjects (Polity)
        if (subject.id === 'polity') {
            headerBtn.addEventListener('click', () => {
                wrapper.classList.toggle('expanded');
            });
        }

        const topicsList = document.createElement('div');
        topicsList.className = 'subject-topics-list';

        if (subject.id !== 'polity') {
            // Render a styled Coming Soon placeholder
            const comingSoonRow = document.createElement('div');
            comingSoonRow.className = 'coming-soon-row';
            comingSoonRow.style.padding = '18px';
            comingSoonRow.style.color = 'var(--text-secondary)';
            comingSoonRow.style.fontSize = '13.5px';
            comingSoonRow.style.textAlign = 'center';
            comingSoonRow.style.fontStyle = 'italic';
            comingSoonRow.innerText = 'Revision modules for this subject are coming soon!';
            topicsList.appendChild(comingSoonRow);
        } else {
            // Render topics normally for active subjects (Polity)
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
        }

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
    // Deep copy and shuffle options
    quizData = questions.map(q => {
        // Create a copy of the options array and shuffle it
        let shuffledOptions = [...q.options];
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }
        return {
            ...q,
            options: shuffledOptions
        };
    });
    
    if (!incorrectOnlyMode) {
        originalQuizData = [...questions];
        // Create 1-to-1 map of indices
        filteredIndicesMap = quizData.map((_, i) => i);
    }

    // Set topic name in top navbar
    if (navbarTopicTitle) navbarTopicTitle.innerText = currentTopicName;

    // Reset status trackers
    currentIndex = 0;
    userAnswers = new Array(quizData.length).fill(null);

    // Sync UI elements counts
    totalQNum.innerText = quizData.length;

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
            // Color code based on correctness in Study Mode
            const isCorrect = quizData[idx].options[userAnswers[idx]].isCorrect;
            btn.classList.add(isCorrect ? 'correct-ans' : 'wrong-ans');
        }
    });
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



    // Clean dynamic options
    optionsContainer.innerHTML = '';
    rationaleCard.style.display = 'none';
    
    q.options.forEach((opt, optIdx) => {
        const btn = document.createElement('button');
        btn.className = 'option-row-btn';
        btn.type = 'button';
        
        const letter = String.fromCharCode(65 + optIdx);
        btn.innerHTML = `
            <span class="option-circle">${letter}</span>
            <span class="option-text">${opt.text}</span>
        `;
        
        // Sync states if already answered
        const answeredIndex = userAnswers[index];
        const hasBeenAnswered = answeredIndex !== null;

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

        optionsContainer.appendChild(btn);
    });

    // Show rationale immediately if already answered
    if (userAnswers[index] !== null) {
        revealRationale(index);
    }

    // Nav footer controls sync
    prevBtn.disabled = index === 0;
    
    if (index === quizData.length - 1) {
        nextBtn.style.display = 'block';
        nextBtn.innerText = "Finish Quiz";
    } else {
        nextBtn.style.display = 'block';
        nextBtn.innerText = "Next Question";
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

function confirmQuit() {
    if (navbarTopicTitle) navbarTopicTitle.innerText = "Subject Directory";
    switchView('dashboard');
    loadCatalog();
}

// --- Finish Quiz & Render Results Dashboard ---
function finishQuiz() {
    
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

    // Metrics table row updates
    metricTopic.innerText = currentTopicName;
    metricAccuracy.innerText = `${percentage}%`;
    metricAttempted.innerText = `${attemptedCount} of ${totalQuestions}`;

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

    const itemsToRender = [];

    quizData.forEach((q, idx) => {
        const userSelection = userAnswers[idx];
        
        let status = 'unanswered';
        let isCorrect = false;
        
        if (userSelection !== null) {
            isCorrect = q.options[userSelection].isCorrect;
            status = isCorrect ? 'correct' : 'incorrect';
            if (isCorrect) correctCnt++; else incorrectCnt++;
        } else {
            incorrectCnt++; // unanswered items count as incorrect
        }

        // Filter checks
        let matchesFilter = false;
        if (filterMode === 'all') matchesFilter = true;
        else if (filterMode === 'correct' && status === 'correct') matchesFilter = true;
        else if (filterMode === 'incorrect' && (status === 'incorrect' || status === 'unanswered')) matchesFilter = true;

        if (matchesFilter) {
            itemsToRender.push({ q, idx, status, userSelection });
        }
    });

    // Update segment buttons counters
    document.getElementById('filter-cnt-all').innerText = allCnt;
    document.getElementById('filter-cnt-correct').innerText = correctCnt;
    document.getElementById('filter-cnt-incorrect').innerText = incorrectCnt;

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
