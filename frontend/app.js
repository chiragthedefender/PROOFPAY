const API_URL = 'http://localhost:3000/api';
const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

let provider, signer, userAddress = null;

// DOM Elements
const btnConnect = document.getElementById('connect-wallet');
const walletInfo = document.getElementById('wallet-info');
const walletAddressDisplay = document.getElementById('wallet-address');

// Navigation DOM Elements
const navOverview = document.getElementById('nav-overview');
const navContracts = document.getElementById('nav-contracts');
const navCreate = document.getElementById('nav-create');
const navProfile = document.getElementById('nav-profile');

const views = {
    overview: document.getElementById('view-overview'),
    contracts: document.getElementById('view-contracts'),
    create: document.getElementById('view-create'),
    profile: document.getElementById('view-profile')
};

function switchView(target) {
    // Update active nav class
    [navOverview, navContracts, navCreate, navProfile].forEach(n => n.classList.remove('active'));
    document.getElementById('nav-' + target).classList.add('active');
    
    // Toggle view visibility
    Object.keys(views).forEach(v => {
        if (v === target) {
            views[v].classList.remove('hidden');
        } else {
            views[v].classList.add('hidden');
        }
    });

    if (target === 'contracts') fetchJobs();
    if (target === 'overview' && userAddress) fetchProfile();
}

navOverview.addEventListener('click', () => switchView('overview'));
navContracts.addEventListener('click', () => switchView('contracts'));
navCreate.addEventListener('click', () => switchView('create'));
navProfile.addEventListener('click', () => switchView('profile'));

// Modals/UI
const toastEl = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');
const overlay = document.getElementById('transaction-overlay');

function showToast(message) {
    toastMsg.textContent = message;
    toastEl.classList.remove('hidden');
    toastEl.classList.add('show');
    setTimeout(() => {
        toastEl.classList.remove('show');
        setTimeout(() => toastEl.classList.add('hidden'), 400);
    }, 4000);
}
function setOverlay(show, title='', desc='') {
    if (show) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-desc').textContent = desc;
        overlay.classList.remove('hidden');
    } else overlay.classList.add('hidden');
}

// WALLET & BACKEND FETCHING
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            signer = await provider.getSigner();
            userAddress = accounts[0];
            
            btnConnect.classList.add('hidden');
            walletInfo.classList.remove('hidden');
            walletAddressDisplay.textContent = `${userAddress.substring(0,6)}...${userAddress.substring(38)}`;
            
            document.getElementById('profile-address').textContent = userAddress;
            fetchProfile();
            showToast("Wallet connected ⚡");
        } catch (error) { showToast("Wallet connect failed"); }
    } else showToast("Install MetaMask!");
}

async function fetchProfile() {
    if(!userAddress) return;
    try {
        const res = await fetch(`${API_URL}/users/${userAddress}`);
        const data = await res.json();
        
        // Populate Overview / Profile Stats
        document.getElementById('user-reputation').textContent = data.reputationScore;
        document.getElementById('user-active-jobs').textContent = data.activeJobs;
        document.getElementById('user-earned').textContent = data.totalEarned.toFixed(2);
    } catch(e) { console.warn("Failed to fetch profile"); }
}

async function fetchJobs() {
    if(!userAddress) return;
    const container = document.getElementById('jobs-container');
    try {
        const res = await fetch(`${API_URL}/jobs`);
        const jobs = await res.json();
        const myJobs = jobs.filter(j => j.clientAddress.toLowerCase() === userAddress.toLowerCase() || (j.freelancerAddress && j.freelancerAddress.toLowerCase() === userAddress.toLowerCase()));
        
        if (myJobs.length === 0) {
            container.innerHTML = '<div class="empty-state glass-panel" style="padding:4rem 2rem;"><p>No active contracts.</p></div>';
            return;
        }

        container.innerHTML = '';
        myJobs.forEach(job => {
            const isClient = job.clientAddress.toLowerCase() === userAddress.toLowerCase();
            const el = document.createElement('div');
            el.className = 'job-ticket glass-panel';
            
            let actionBtn = '';
            if (job.status === 'FUNDED') {
                if(isClient) {
                    actionBtn = `<button class="btn btn-outline" style="border-color:var(--success); color:var(--success);" onclick="releaseFunds('${job.id}')">Release Payout</button>
                                 <button class="btn btn-outline" style="border-color:#ef4444; color:#ef4444; margin-left: 0.5rem;" onclick="disputeFunds('${job.id}')">Dispute</button>`;
                } else {
                    actionBtn = `<span class="badge" style="background:rgba(251,191,36,0.1)">Funds Locked <span class="dot pulse"></span></span>`;
                }
            } else if (job.status === 'RELEASED') {
                actionBtn = `<span class="badge" style="background:var(--success-bg); color:var(--success); border:1px solid var(--success);">Paid</span>`;
            } else if (job.status === 'DISPUTED') {
                actionBtn = `<span class="badge" style="background:rgba(239, 68, 68, 0.1); color:#ef4444; border:1px solid #ef4444;">Resolution Pending</span>`;
            }

            el.innerHTML = `
                <div>
                    <h4 style="font-size:1.1rem; margin-bottom:0.25rem;">${job.title}</h4>
                    <div style="font-size:0.875rem; color:var(--text-secondary); display:flex; gap:1rem;">
                        <span><strong>${job.budget} ETH</strong></span>
                        <span>Role: ${isClient ? 'Client' : 'Freelancer'}</span>
                    </div>
                </div>
                <div>${actionBtn}</div>
            `;
            container.appendChild(el);
        });
    } catch(e) {}
}

document.getElementById('create-job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!userAddress) return showToast("Connect wallet to create contract");

    const btn = document.getElementById('btn-create-job');
    const title = document.getElementById('job-title').value;
    const freelancerAddress = document.getElementById('freelancer-address').value;
    const budget = document.getElementById('job-budget').value;

    btn.disabled = true;
    setOverlay(true, "Deploying Escrow", "Confirm transaction in wallet");

    try {
        await new Promise(r => setTimeout(r, 1500)); // Delay Mock
        const res = await fetch(`${API_URL}/jobs`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title, description: 'Trustless gig', budget, clientAddress: userAddress, freelancerAddress })
        });
        const job = await res.json();
        
        await fetch(`${API_URL}/jobs/${job.id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: 'FUNDED', blockchainJobId: 999 })
        });

        setOverlay(false);
        showToast("Escrow deployed and funded! 🔒");
        e.target.reset();
        fetchProfile();
        switchView('contracts');
    } catch(err) { setOverlay(false); showToast("Failed to create contract."); }
    btn.disabled = false;
});

window.releaseFunds = async function(id) {
    setOverlay(true, "Releasing Escrow", "Sign payout tx");
    try {
        await new Promise(r => setTimeout(r, 1000));
        await fetch(`${API_URL}/jobs/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ status: 'RELEASED' }) });
        setOverlay(false); showToast("Payout transferred! 💸");
        fetchJobs(); fetchProfile();
    } catch(e) { setOverlay(false); }
}

window.disputeFunds = async function(id) {
    setOverlay(true, "Raising Dispute", "Locking contract for arbitration...");
    try {
        await new Promise(r => setTimeout(r, 1000));
        await fetch(`${API_URL}/jobs/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ status: 'DISPUTED' }) });
        setOverlay(false); showToast("Contract in Dispute. Arbitration notified. 🚨");
        fetchJobs();
    } catch(e) { setOverlay(false); }
}

document.getElementById('btn-refresh-contracts').addEventListener('click', fetchJobs);
btnConnect.addEventListener('click', connectWallet);

// Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    let currentTheme = document.documentElement.getAttribute('data-theme');
    if(currentTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
});
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light' || (!savedTheme && window.matchMedia('(prefers-color-scheme: light)').matches)) {
    document.documentElement.setAttribute('data-theme', 'light');
}
