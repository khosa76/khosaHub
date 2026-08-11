// mains_tester.js - Apple-Inspired Mains Q&A Practice Engine

const MAINS_SUBJECTS = [
    {
        id: "polity",
        name: "Indian Polity & Governance",
        icon: "⚖️",
        description: "Constitutional framework, Fundamental Rights, Federalism, Preamble, and Citizenship.",
        status: "active",
        modules: [
            {
                topicId: "polity-preamble",
                topicName: "Preamble & Sovereign Will",
                path: "mains/polity/polity-preamble-mains.json"
            },
            {
                topicId: "polity-federalism",
                topicName: "Federalism & Constitutional Amendments",
                path: "mains/polity/polity-federalism-and-amendments-mains.json"
            },
            {
                topicId: "polity-citizenship",
                topicName: "Citizenship Modes & Passport Status",
                path: "mains/polity/polity-citizenship-mains.json"
            },
            {
                topicId: "polity-article19",
                topicName: "Free Speech (19-1-a) & Reasonable Restrictions",
                path: "mains/polity/polity-article19-and-liberty-mains.json"
            },
            {
                topicId: "polity-privacy-dpsp",
                topicName: "Right to Privacy Evolution & DPSPs",
                path: "mains/polity/polity-privacy-and-dpsp-mains.json"
            }
        ]
    },
    {
        id: "history",
        name: "Modern Indian & World History",
        icon: "📜",
        description: "National movement, British rule, ancient philosophy, medieval Cholas & world revolutions.",
        status: "coming_soon"
    },
    {
        id: "geography",
        name: "Geography & Environment",
        icon: "🌍",
        description: "Physical geography, population demography, climatology, El Nino/La Nina & mapping.",
        status: "coming_soon"
    },
    {
        id: "economy",
        name: "Indian Economy & Microeconomics",
        icon: "📈",
        description: "Five Year Plans, economic models, microeconomics, market structures & budget policy.",
        status: "coming_soon"
    },
    {
        id: "science_tech",
        name: "Science & Technology",
        icon: "🔬",
        description: "Space tech, biology evolution, physics mechanics, biotechnology & health vectors.",
        status: "coming_soon"
    },
    {
        id: "punjab_gk",
        name: "Punjab GK & State History",
        icon: "🌾",
        description: "Punjab geography, canal irrigation system, Sikh Gurus history & heritage.",
        status: "coming_soon"
    }
];

let activeSubjectQuestions = [];

document.addEventListener('DOMContentLoaded', () => {
    initMainsApp();
});

function initMainsApp() {
    renderSubjectSections();

    // View Navigation Buttons
    const backToSubjectsBtn = document.getElementById('back-to-subjects-btn');
    if (backToSubjectsBtn) {
        backToSubjectsBtn.addEventListener('click', showSubjectsView);
    }

    // Filter listeners
    const topicSelect = document.getElementById('topic-select');
    const searchInput = document.getElementById('search-input');
    
    if (topicSelect) topicSelect.addEventListener('change', filterQuestions);
    if (searchInput) searchInput.addEventListener('input', filterQuestions);

    // Check URL parameters for direct subject launcher (e.g. ?subject=polity)
    const urlParams = new URLSearchParams(window.location.search);
    const subjectParam = urlParams.get('subject');
    if (subjectParam) {
        const found = MAINS_SUBJECTS.find(s => s.id === subjectParam && s.status === 'active');
        if (found) {
            loadSubjectMainsQuestions(found);
        }
    }
}

// --- View Switcher ---
function showSubjectsView() {
    document.getElementById('subjects-view').classList.add('active');
    document.getElementById('questions-view').classList.remove('active');
    
    document.getElementById('mains-page-title').innerText = "Mains Q&A Practice Room";
    document.getElementById('mains-page-subtitle').innerText = "Select a subject section to practice Mains Answer Writing & Model Solutions";
    document.getElementById('mains-nav-back').style.display = "inline-flex";
}

function showQuestionsView(subjectName) {
    document.getElementById('subjects-view').classList.remove('active');
    document.getElementById('questions-view').classList.add('active');
    
    document.getElementById('active-subject-badge').innerText = subjectName;
    document.getElementById('mains-page-title').innerText = `${subjectName} - Mains Answer Vault`;
    document.getElementById('mains-page-subtitle').innerText = "Structured Model Answers, Introductions, Points & Conclusions";
}

// --- Render Subject Directory Cards ---
function renderSubjectSections() {
    const container = document.getElementById('mains-subjects-container');
    if (!container) return;
    
    container.innerHTML = '';

    MAINS_SUBJECTS.forEach(subj => {
        const card = document.createElement('div');
        card.className = `mains-subject-card ${subj.status === 'active' ? 'active-card' : 'disabled-card'}`;

        const badgeHtml = subj.status === 'active' 
            ? `<span class="badge-active-subject">Available</span>`
            : `<span class="badge-coming-soon">Coming Soon</span>`;

        card.innerHTML = `
            <div>
                <div class="card-subject-header">
                    <span class="card-subject-icon">${subj.icon}</span>
                    ${badgeHtml}
                </div>
                <h3 class="card-subject-title">${subj.name}</h3>
                <p class="card-subject-desc">${subj.description}</p>
            </div>
            <div style="margin-top: 14px; text-align: right; font-size: 13px; font-weight: 600; color: ${subj.status === 'active' ? 'var(--ink-blue)' : '#94a3b8'};">
                ${subj.status === 'active' ? 'Open Mains Room →' : 'Modules in prep'}
            </div>
        `;

        card.addEventListener('click', () => {
            if (subj.status === 'active') {
                loadSubjectMainsQuestions(subj);
            } else {
                alert(`Mains answer writing practice modules for "${subj.name}" are coming soon!`);
            }
        });

        container.appendChild(card);
    });
}

// --- Load Mains Questions for Selected Subject ---
async function loadSubjectMainsQuestions(subject) {
    activeSubjectQuestions = [];
    
    const topicSelect = document.getElementById('topic-select');
    topicSelect.innerHTML = '<option value="all">📚 All Syllabus Topics</option>';

    // Populate topics dropdown
    if (subject.modules) {
        subject.modules.forEach(mod => {
            const opt = document.createElement('option');
            opt.value = mod.topicId;
            opt.textContent = mod.topicName;
            topicSelect.appendChild(opt);
        });

        // Load JSON files
        for (const mod of subject.modules) {
            try {
                const res = await fetch(mod.path);
                if (res.ok) {
                    const data = await res.json();
                    data.forEach(q => {
                        activeSubjectQuestions.push({
                            ...q,
                            topicId: mod.topicId,
                            topicName: mod.topicName,
                            subject: subject.name
                        });
                    });
                }
            } catch (err) {
                console.error(`Failed to load ${mod.path}:`, err);
            }
        }
    }

    showQuestionsView(subject.name);
    renderMainsQuestionsList(activeSubjectQuestions);
}

function filterQuestions() {
    const selectedTopic = document.getElementById('topic-select').value;
    const query = document.getElementById('search-input').value.toLowerCase().trim();

    const filtered = activeSubjectQuestions.filter(item => {
        const matchTopic = selectedTopic === 'all' || item.topicId === selectedTopic;
        const matchQuery = !query || 
            item.question.toLowerCase().includes(query) ||
            item.topicName.toLowerCase().includes(query) ||
            (item.answer && item.answer.introduction && item.answer.introduction.toLowerCase().includes(query));
        return matchTopic && matchQuery;
    });

    renderMainsQuestionsList(filtered);
}

function renderMainsQuestionsList(questions) {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    if (!questions || questions.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                🔍 No Mains questions match your current filter or search criteria.
            </div>
        `;
        return;
    }

    questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'mains-card';

        const qNum = q.question_number || `Q${idx + 1}`;
        const marksStr = q.marks ? `${q.marks} Marks` : '15 Marks';
        const wordsStr = q.word_limit ? `${q.word_limit} Words` : '250 Words';

        // Render natural handwritten model answer flow
        let answerFlowHtml = '';
        if (q.answer) {
            if (q.answer.introduction) {
                answerFlowHtml += `<p class="handwritten-p">${applyHighlighters(cleanCitations(q.answer.introduction))}</p>`;
            }
            if (q.answer.sections) {
                q.answer.sections.forEach(sec => {
                    if (sec.title) {
                        answerFlowHtml += `<h4 class="handwritten-subheading">✦ ${sec.title}</h4>`;
                    }
                    if (sec.points && sec.points.length > 0) {
                        answerFlowHtml += `<ul class="handwritten-list">`;
                        sec.points.forEach(pt => {
                            answerFlowHtml += `<li>${applyHighlighters(cleanCitations(pt))}</li>`;
                        });
                        answerFlowHtml += `</ul>`;
                    }
                });
            }
            if (q.answer.conclusion) {
                answerFlowHtml += `<p class="handwritten-p" style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed rgba(30, 58, 138, 0.2);">${applyHighlighters(cleanCitations(q.answer.conclusion))}</p>`;
            }
        }

        card.innerHTML = `
            <div class="card-top-meta">
                <span class="topic-tag">${q.topicName}</span>
                <div class="badge-row">
                    <span class="badge-marks">🏷️ ${marksStr}</span>
                    <span class="badge-words">✍️ ${wordsStr}</span>
                </div>
            </div>
            
            <h3 class="mains-question-heading rich-content">${qNum}. ${q.question}</h3>

            <button class="answer-toggle-btn" type="button">
                <span>📝 Read Answer</span>
                <span class="toggle-arrow">▼</span>
            </button>

            <div class="answer-drawer">
                <div class="handwritten-paper-sheet">
                    ${answerFlowHtml}
                </div>
            </div>
        `;

        // Accordion toggle click handler
        const toggleBtn = card.querySelector('.answer-toggle-btn');
        toggleBtn.addEventListener('click', () => {
            card.classList.toggle('open');
            const btnText = toggleBtn.querySelector('span:first-child');
            if (card.classList.contains('open')) {
                btnText.innerText = "📂 Hide Answer";
            } else {
                btnText.innerText = "📝 Read Answer";
            }
        });

        container.appendChild(card);
    });
}

function cleanCitations(text) {
    if (!text) return '';
    return text.replace(/\[cite:\s*[\d,\s]+\]/gi, '');
}

function applyHighlighters(text) {
    if (!text) return '';
    
    // Highlight key legal terms, landmark cases, articles, and constitutional provisions
    const keyPatterns = [
        /(Preamble|Sovereign|Secular|Socialist|Democratic|Republic|Justice|Liberty|Equality|Fraternity)/g,
        /(Article\s+\d+([A-Z])?(\(\d+\))?)/gi,
        /(Basic Structure|Fundamental Rights|Directive Principles|DPSP|Supreme Court|High Court|Collegium)/g,
        /(Kesavananda Bharati|Maneka Gandhi|Puttaswamy|SR Bommai|Minerva Mills)/gi,
        /(Federalism|Sovereignty|Quasi-federal|73rd Amendment|74th Amendment|NITI Aayog)/g
    ];

    let highlighted = text;
    highlighted = highlighted.replace(/(Preamble|Basic Structure|Fundamental Rights|Directive Principles)/gi, '<span class="hl-yellow">$1</span>');
    highlighted = highlighted.replace(/(Article\s+\d+([A-Z])?(\(\d+\))?)/gi, '<span class="hl-pink">$1</span>');
    highlighted = highlighted.replace(/(Kesavananda Bharati|Maneka Gandhi|Puttaswamy|SR Bommai)/gi, '<span class="hl-blue">$1</span>');
    highlighted = highlighted.replace(/(Sovereign|Secular|Socialist|Democratic|Republic)/gi, '<span class="hl-green">$1</span>');

    return highlighted;
}
