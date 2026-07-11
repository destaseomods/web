// ================= KONFIGURASI WAJIB =================
const GITHUB_OWNER = 'destaseomods';    // Ganti!
const GITHUB_REPO = 'web';    // Ganti!
const POSTS_DIR = 'posts';
// =====================================================

const postList = document.getElementById('post-list');
const postDetail = document.getElementById('post-detail');
const detailContent = document.getElementById('detail-content');
const aboutSection = document.getElementById('about');
const backButton = document.getElementById('back-button');

let postsCache = [];

async function fetchPosts() {
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_DIR}`;
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const files = await res.json();
        const mdFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.md'));
        mdFiles.sort((a, b) => b.name.localeCompare(a.name));
        return mdFiles;
    } catch (err) {
        console.error(err);
        postList.innerHTML = `<p style="text-align:center;color:var(--text-secondary)">⚠️ Gagal memuat postingan. Pastikan repo publik dan folder "posts" ada.</p>`;
        return [];
    }
}

async function fetchMarkdown(file) {
    const res = await fetch(file.download_url);
    if (!res.ok) throw new Error('Gagal ambil konten');
    return await res.text();
}

function parsePost(md, fileName) {
    const lines = md.split('\n');
    let title = '';
    let excerpt = '';
    for (let line of lines) {
        if (line.startsWith('# ')) {
            title = line.replace('# ', '').trim();
            break;
        }
    }
    if (!title) title = fileName.replace(/\.md$/, '').replace(/-/g, ' ');
    const dateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})-/);
    const date = dateMatch ? dateMatch[1] : null;
    let foundHead = false;
    for (let line of lines) {
        if (foundHead) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('>') && !trimmed.startsWith('![') && !trimmed.startsWith('```')) {
                excerpt = trimmed.substring(0, 200);
                break;
            }
        }
        if (line.startsWith('# ')) foundHead = true;
    }
    if (!excerpt) excerpt = title;
    return { title, date, excerpt, markdown: md, fileName };
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderPostList(posts) {
    let html = '';
    posts.forEach(post => {
        const dateFormatted = post.date ? formatDate(post.date) : 'Tanpa tanggal';
        html += `
            <article class="post-card" data-filename="${post.fileName}">
                <h2>${post.title}</h2>
                <div class="post-meta">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <time datetime="${post.date || ''}">${dateFormatted}</time>
                </div>
                <p class="excerpt">${post.excerpt}</p>
                <a href="#post/${post.fileName}" class="read-more">Baca selengkapnya →</a>
            </article>
        `;
    });
    postList.innerHTML = html;

    document.querySelectorAll('.post-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            window.location.hash = `#post/${card.dataset.filename}`;
        });
    });
}

async function showPostDetail(filename) {
    const post = postsCache.find(p => p.fileName === filename);
    if (!post) {
        detailContent.innerHTML = '<p>Postingan tidak ditemukan.</p>';
    } else {
        const htmlContent = marked.parse(post.markdown);
        detailContent.innerHTML = `
            <h1>${post.title}</h1>
            <p class="post-date">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${post.date ? formatDate(post.date) : ''}
            </p>
            <div class="post-body">${htmlContent}</div>
        `;
    }
}

function showView(view) {
    postList.style.display = 'none';
    postDetail.style.display = 'none';
    aboutSection.style.display = 'none';
    if (view === 'list') postList.style.display = 'block';
    else if (view === 'detail') postDetail.style.display = 'block';
    else if (view === 'about') aboutSection.style.display = 'block';
}

function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#post/')) {
        showPostDetail(hash.substring(6));
        showView('detail');
        window.scrollTo(0, 0);
    } else if (hash === '#about') {
        showView('about');
    } else {
        showView('list');
    }
}

backButton.addEventListener('click', () => { window.location.hash = '#'; });
window.addEventListener('hashchange', handleHashChange);

// Init
(async () => {
    const files = await fetchPosts();
    if (!files.length) {
        postList.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">Belum ada postingan. Tambahkan file .md ke folder "posts".</p>';
        return;
    }
    const posts = await Promise.all(
        files.map(async file => {
            const md = await fetchMarkdown(file);
            return parsePost(md, file.name);
        })
    );
    postsCache = posts;
    renderPostList(posts);
    handleHashChange();
})();
