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
// --- DOM Elements Cache ---
const views = {
    subjectCards: document.getElementById('subject-cards-view'),
    topicModules: document.getElementById('topic-modules-view'),
    quiz: document.getElementById('quiz-view'),
    results: document.getElementById('results-view')
};

// UI Widgets
const navbarTopicTitle = document.getElementById('navbar-topic-title');
const subjectCardsContainer = document.getElementById('subject-cards-container');
const topicModulesContainer = document.getElementById('topic-modules-container');
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
    // Back to Subjects button
    const backToSubjectsBtn = document.getElementById('back-to-subjects-btn');
    if (backToSubjectsBtn) {
        backToSubjectsBtn.addEventListener('click', () => {
            if (navbarTopicTitle) navbarTopicTitle.innerText = "Subject Directory";
            switchView('subjectCards');
        });
    }

    // Quiz Navigation Buttons
    prevBtn.addEventListener('click', () => navigateQuestion(currentIndex - 1));
    nextBtn.addEventListener('click', () => {
        if (currentIndex < quizData.length - 1) {
            navigateQuestion(currentIndex + 1);
        } else {
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
        switchView('subjectCards');
        loadCatalog();
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
        if (views[key]) {
            if (key === viewName) {
                views[key].classList.add('active');
            } else {
                views[key].classList.remove('active');
            }
        }
    });
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
        if (subjectCardsContainer) {
            subjectCardsContainer.innerHTML = `
                <div class="catalog-loading" style="color: var(--error-red);">
                    ⚠️ Error loading subjects index registry. Ensure 'mcqs/quizzes.json' exists.
                </div>
            `;
        }
    }
}

// --- Render Subject Cards Grid Dashboard ---
let activeGroupFilter = 'all';

function renderDashboardCatalog() {
    if (!catalogData || !catalogData.subjects || !subjectCardsContainer) return;
    
    subjectCardsContainer.innerHTML = '';
    
    // Setup filter pill click handlers
    document.querySelectorAll('.group-pill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.group-pill-btn').forEach(b => {
                b.classList.remove('active');
                b.style.background = 'var(--bg-card)';
                b.style.color = 'var(--text-muted)';
            });
            const clickedBtn = e.currentTarget;
            clickedBtn.classList.add('active');
            clickedBtn.style.background = 'var(--primary-blue)';
            clickedBtn.style.color = 'white';
            activeGroupFilter = clickedBtn.dataset.filter;
            renderDashboardCatalogFiltered();
        });
    });

    renderDashboardCatalogFiltered();
}

function renderDashboardCatalogFiltered() {
    if (!catalogData || !catalogData.subjects || !subjectCardsContainer) return;
    subjectCardsContainer.innerHTML = '';

    // Check URL query parameters (e.g. ?subject=polity)
    const urlParams = new URLSearchParams(window.location.search);
    const targetSubjectId = urlParams.get('subject');

    catalogData.subjects.forEach((subject) => {
        const iconStr = subject.icon || '📖';
        
        // Filter topics by activeGroupFilter
        const filteredTopics = (subject.topics || []).filter(t => {
            if (activeGroupFilter === 'all') return true;
            const tType = t.groupType || (t.path && t.path.includes('selection_test') ? 'selection_test' : (t.path && t.path.includes('fulltest') ? 'full_mock' : 'subject_test'));
            return tType === activeGroupFilter;
        });

        if (activeGroupFilter !== 'all' && filteredTopics.length === 0) return;

        const subjectTestsCount = (subject.topics || []).filter(t => t.groupType === 'subject_test').length;
        const selectionTestsCount = (subject.topics || []).filter(t => t.groupType === 'selection_test').length;
        const fullMocksCount = (subject.topics || []).filter(t => t.groupType === 'full_mock').length;
        const totalQs = filteredTopics.reduce((acc, t) => acc + (t.questionCount || 0), 0);

        const card = document.createElement('div');
        card.className = 'mcq-subject-card';

        let breakdownBadges = '';
        if (subjectTestsCount > 0) breakdownBadges += `<span class="badge-pill badge-gray">📘 ${subjectTestsCount} Subject Test${subjectTestsCount !== 1 ? 's' : ''}</span> `;
        if (selectionTestsCount > 0) breakdownBadges += `<span class="badge-pill badge-amber">⚡ ${selectionTestsCount} Selection Test${selectionTestsCount !== 1 ? 's' : ''}</span> `;
        if (fullMocksCount > 0) breakdownBadges += `<span class="badge-pill badge-green">🎓 ${fullMocksCount} Full Mock${fullMocksCount !== 1 ? 's' : ''}</span>`;

        card.innerHTML = `
            <div class="card-subject-header">
                <span class="card-subject-icon">${iconStr}</span>
                <span class="badge-pill badge-blue">${totalQs} Qs</span>
            </div>
            <h3 class="card-subject-title">${subject.name}</h3>
            <p class="card-subject-desc">${subject.description || 'Interactive MCQ practice modules and topic revision sets.'}</p>
            <div class="card-subject-breakdown" style="margin-bottom: 14px; display: flex; flex-wrap: wrap; gap: 6px;">
                ${breakdownBadges}
            </div>
            <div class="card-subject-footer">
                <span class="badge-pill badge-gray">${filteredTopics.length} Practice Module${filteredTopics.length !== 1 ? 's' : ''}</span>
                <span class="card-open-arrow">Open Modules List →</span>
            </div>
        `;

        card.addEventListener('click', () => {
            openSubjectTopics(subject.id);
        });

        subjectCardsContainer.appendChild(card);
    });

    // Auto open target subject if specified in URL
    if (targetSubjectId && !window._openedSubjectTarget) {
        window._openedSubjectTarget = true;
        openSubjectTopics(targetSubjectId);
    } else if (!targetSubjectId) {
        switchView('subjectCards');
    }
}

// --- Open Dedicated Topic List View for Selected Subject ---
function openSubjectTopics(subjectId) {
    if (!catalogData || !catalogData.subjects) return;
    
    const subject = catalogData.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    // Update Header Text & Badges
    const mcqSubjectTitle = document.getElementById('mcq-subject-title');
    const mcqSubjectDesc = document.getElementById('mcq-subject-desc');
    const activeSubjectBadge = document.getElementById('active-mcq-subject-badge');

    if (mcqSubjectTitle) mcqSubjectTitle.innerText = `${subject.icon || '📖'} ${subject.name}`;
    if (mcqSubjectDesc) mcqSubjectDesc.innerText = subject.description || 'Select a topic module below to start practicing questions.';
    if (activeSubjectBadge) activeSubjectBadge.innerText = subject.name;
    if (navbarTopicTitle) navbarTopicTitle.innerText = subject.name;

    // Render Topic Rows Grouped by Group Type
    if (topicModulesContainer) {
        topicModulesContainer.innerHTML = '';

        if (!subject.topics || subject.topics.length === 0) {
            topicModulesContainer.innerHTML = `
                <div class="coming-soon-row" style="padding: 24px; text-align: center; color: var(--text-secondary); font-style: italic;">
                    No practice modules currently available for this subject.
                </div>
            `;
        } else {
            // Group definitions
            const groups = {
                subject_test: {
                    title: '📘 Normal Subject Practice Tests',
                    desc: 'Topic-wise standard practice modules and chapter revision vaults',
                    items: []
                },
                selection_test: {
                    title: '⚡ Selection Tests (100-Question High-Yield Exam Modules)',
                    desc: 'Comprehensive Adda247 exam selection test modules',
                    items: []
                },
                full_mock: {
                    title: '🎓 Full-Length Mock Exams',
                    desc: 'Complete 100-question General Studies mock exam papers',
                    items: []
                }
            };

            subject.topics.forEach(topic => {
                const type = topic.groupType || (topic.path && topic.path.includes('selection_test') ? 'selection_test' : (topic.path && topic.path.includes('fulltest') ? 'full_mock' : 'subject_test'));
                if (!groups[type]) {
                    groups[type] = {
                        title: '📋 Additional Practice Tests',
                        desc: 'Practice modules',
                        items: []
                    };
                }
                groups[type].items.push(topic);
            });

            // Render each group that has items
            Object.keys(groups).forEach(gKey => {
                const group = groups[gKey];
                if (group.items.length === 0) return;

                const groupHeader = document.createElement('div');
                groupHeader.className = 'topic-group-header';
                groupHeader.style.cssText = 'margin-top: 24px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px dashed var(--border-medium);';
                groupHeader.innerHTML = `
                    <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                        ${group.title}
                        <span class="badge-pill badge-blue" style="font-size: 12px;">${group.items.length} Test${group.items.length !== 1 ? 's' : ''}</span>
                    </h3>
                    <p style="font-size: 13.5px; color: var(--text-muted); margin: 0;">${group.desc}</p>
                `;
                topicModulesContainer.appendChild(groupHeader);

                group.items.forEach(topic => {
                    const topicRow = document.createElement('div');
                    topicRow.className = 'topic-list-row';
                    
                    const localKey = `khosa_mcq_highscore_${topic.id}`;
                    const localDataStr = localStorage.getItem(localKey);
                    let scoreMetaHtml = '';
                    if (localDataStr) {
                        const meta = JSON.parse(localDataStr);
                        scoreMetaHtml = `<span class="badge-pill badge-blue">${meta.score}/${meta.total} (${meta.percent}%)</span>`;
                    }

                    const isSelection = topic.groupType === 'selection_test';
                    const isMock = topic.groupType === 'full_mock';
                    const badgeClass = isSelection ? 'badge-amber' : (isMock ? 'badge-green' : 'badge-gray');
                    const badgeTag = isSelection ? '⚡ Selection Test' : (isMock ? '🎓 Full Mock' : '📘 Subject Test');

                    topicRow.innerHTML = `
                        <div class="topic-info-side">
                            <h5 class="topic-row-title">${topic.name}</h5>
                            <p class="topic-row-desc">${topic.description}</p>
                        </div>
                        <div class="topic-badges-side">
                            <span class="badge-pill ${badgeClass}">${badgeTag}</span>
                            <span class="badge-pill badge-gray">${topic.questionCount} Qs</span>
                            ${scoreMetaHtml}
                            <span class="list-chevron">›</span>
                        </div>
                    `;

                    topicRow.addEventListener('click', () => {
                        loadQuizFromPath(topic.path, topic.id, topic.name);
                    });

                    topicModulesContainer.appendChild(topicRow);
                });
            });
        }
    }

    switchView('topicModules');
}

// --- Question Schema Normalizer (Preserves rich HTML elements like tables, bold text, lists) ---
function normalizeQuestions(data) {
    if (Array.isArray(data)) {
        return data.map(item => ({
            ...item,
            question: item.question || '',
            explanation: item.explanation || item.rationale || '',
            options: (item.options || []).map(o => ({
                ...o,
                rationale: o.rationale || ''
            }))
        }));
    }
    if (data && data.ENGLISH && data.ENGLISH.ques && Array.isArray(data.ENGLISH.ques.list)) {
        return data.ENGLISH.ques.list.map(item => {
            const rawQ = item.q ? item.q.t : '';
            const rawSol = item.so ? item.so.t : '';
            
            // Retain rich HTML content (tables, formatting) while trimming extra trailing breaks
            const cleanQ = rawQ.replace(/(\s*<br\s*\/?>\s*)+$/gi, '').trim();
            const cleanSol = rawSol.replace(/(\s*<br\s*\/?>\s*)+$/gi, '').trim();
            
            const options = (item.opt || []).map(o => {
                const optText = (o.t || '').replace(/(\s*<br\s*\/?>\s*)+$/gi, '').trim();
                return {
                    text: optText,
                    isCorrect: !!o.co,
                    rationale: o.co ? cleanSol : ''
                };
            });
            
            return {
                question: cleanQ,
                explanation: cleanSol,
                options: options,
                hint: cleanSol ? "Detailed solution breakdown is provided in the explanation below." : "Read the options carefully."
            };
        });
    }
    return [];
}

// --- Load Quiz JSON ---
async function loadQuizFromPath(path, topicId, topicName) {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load quiz from ${path}`);
        const data = await response.json();
        
        const normalized = normalizeQuestions(data);
        if (!normalized || normalized.length === 0) {
            throw new Error("No questions could be loaded from this file.");
        }
        
        currentTopicId = topicId;
        currentTopicName = topicName;
        incorrectOnlyMode = false;
        
        startQuiz(normalized);
    } catch (err) {
        console.error(err);
        alert(`Failed to load the quiz file: ${err.message}`);
    }
}

// --- Start Quiz Runtime ---
function startQuiz(questions) {
    // Preserve exact JSON option sequence (A, B, C, D)
    quizData = questions.map(q => ({
        ...q,
        options: [...q.options]
    }));
    
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
    
    // Set Question Text with rich HTML support (tables, bold text, lists, statement breaks)
    questionText.innerHTML = formatRichHtmlText(q.question);
    
    // Hint setup
    hintContainer.classList.remove('open');
    if (q.hint && q.hint.trim() !== '') {
        hintContainer.style.display = 'block';
        hintText.innerHTML = formatRichHtmlText(q.hint);
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
            <span class="option-text">${formatRichHtmlText(opt.text)}</span>
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
    const correctOpt = q.options.find(o => o.isCorrect);
    
    rationaleCard.style.display = 'block';
    
    const mainExplanation = q.explanation || (correctOpt ? correctOpt.rationale : '') || selectedOpt.rationale || '';

    if (selectedOpt.isCorrect) {
        rationaleCard.className = "explanation-panel"; // green layout
        feedbackBadge.innerText = "Correct";
        feedbackBadge.className = "result-badge badge-success";
        rationaleText.innerHTML = formatRichHtmlText(mainExplanation || "Great job! That is the correct option.");
    } else {
        rationaleCard.className = "explanation-panel wrong-explanation"; // red layout
        feedbackBadge.innerText = "Incorrect";
        feedbackBadge.className = "result-badge badge-error";
        
        let content = '';
        if (correctOpt) {
            content += `<div style="margin-bottom: 12px;"><span class="badge-pill" style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-weight: 700; padding: 5px 12px; font-size: 13.5px; display: inline-block;">✓ Correct Answer: ${correctOpt.text}</span></div>`;
        }
        
        if (selectedOpt.rationale && selectedOpt.rationale !== mainExplanation) {
            content += `<div style="margin-bottom: 10px;">${formatRichHtmlText(selectedOpt.rationale)}</div>`;
        }
        
        content += `<div>${formatRichHtmlText(mainExplanation)}</div>`;
        rationaleText.innerHTML = content;
    }
}

function formatRichHtmlText(text) {
    if (!text) return '';
    let formatted = text;
    
    // 1. Process <table>...</table> blocks first: strip internal \n and extraneous <br> tags
    formatted = formatted.replace(/(<table[\s\S]*?<\/table>)/gi, (match) => {
        let cleanTable = match.replace(/\r?\n/g, ' ');
        cleanTable = cleanTable.replace(/(<td>\s*)<br\s*\/?>/gi, '$1');
        cleanTable = cleanTable.replace(/<br\s*\/?>(\s*<\/td>)/gi, '$1');
        return cleanTable;
    });

    // 2. Convert literal \n outside tables to <br>
    formatted = formatted.replace(/\r?\n/g, '<br>');

    // 3. Fix artificial mid-sentence <br> splits (where <br> breaks a sentence across lines)
    formatted = formatted.replace(/<br\s*\/?>\s*(?!(Statement\s+\d+|Pair\s+\d+|Option\s+[A-D]|Why\s+[A-D]|•|&bull;|\d+\.\s+[A-Z]|<table|<div|<p))(?=[a-z0-9\(\)\-,])/gi, ' ');

    // 4. Clean up consecutive <br> tags (replace 2 or more consecutive <br> with just one <br>)
    formatted = formatted.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');

    // 5. Format "Statement X is correct / incorrect" badges
    formatted = formatted.replace(/(?:<br\s*\/?>\s*)?Statement\s+(\d+)\s+is\s+correct:?/gi, 
        '<div style="margin-top: 14px; margin-bottom: 4px;"><span class="badge-pill" style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-weight: 700; padding: 4px 10px; display: inline-block;">✓ Statement $1 is Correct:</span></div>');
    
    formatted = formatted.replace(/(?:<br\s*\/?>\s*)?Statement\s+(\d+)\s+is\s+incorrect:?/gi, 
        '<div style="margin-top: 14px; margin-bottom: 4px;"><span class="badge-pill" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-weight: 600; padding: 4px 10px; display: inline-block;">✕ Statement $1 is Incorrect:</span></div>');

    // 6. Format "Pair X is correctly matched / not correctly matched" badges
    formatted = formatted.replace(/(?:<br\s*\/?>\s*)?Pair\s+(\d+)\s+is\s+correctly\s+matched:?/gi, 
        '<div style="margin-top: 14px; margin-bottom: 4px;"><span class="badge-pill" style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-weight: 700; padding: 4px 10px; display: inline-block;">✓ Pair $1 is Correctly Matched:</span></div>');

    formatted = formatted.replace(/(?:<br\s*\/?>\s*)?Pair\s+(\d+)\s+is\s+not\s+correctly\s+matched:?/gi, 
        '<div style="margin-top: 14px; margin-bottom: 4px;"><span class="badge-pill" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-weight: 600; padding: 4px 10px; display: inline-block;">✕ Pair $1 is Not Correctly Matched:</span></div>');

    // 7. Format "Why Option X is correct / incorrect" badges
    formatted = formatted.replace(/(?:&bull;|\u2022|\u25cf|\u25cb|\u25a0|\u2713)?\s*(?:Why\s+)?(?:Option\s+)?([A-D])\s+is\s+correct:?/gi, 
        '<div style="margin-top: 14px; margin-bottom: 4px;"><span class="badge-pill" style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-weight: 700; padding: 4px 10px; display: inline-block;">✓ Option $1 is Correct:</span></div>');

    formatted = formatted.replace(/(?:&bull;|\u2022|\u25cf|\u25cb|\u25a0|\u2715)?\s*(?:Why\s+)?(?:Option\s+)?([A-D](?:,\s*[A-D])*)\s+(?:is|are)\s+incorrect:?/gi, 
        '<div style="margin-top: 14px; margin-bottom: 4px;"><span class="badge-pill" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-weight: 600; padding: 4px 10px; display: inline-block;">✕ Option $1 are Incorrect:</span></div>');

    // 8. Clean bullet formatting & line breaks
    formatted = formatted.replace(/(?:&bull;|\u2022|\u25cf|\u25cb|\u25a0)\s*/g, '• ');
    formatted = formatted.replace(/^(<br\s*\/?>\s*)+/gi, '').replace(/(<br\s*\/?>\s*)+$/gi, '').trim();

    return formatted;
}

function confirmQuit() {
    if (navbarTopicTitle) navbarTopicTitle.innerText = currentTopicName || "Subject Directory";
    switchView('topicModules');
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
