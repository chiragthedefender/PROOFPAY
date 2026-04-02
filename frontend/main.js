// Advanced Frontend Integration logic for Freelock UI Overhaul
// Using ethers.js injected via CDN

const API_URL = 'http://localhost:3000/api';
const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Placeholder
const CONTRACT_ABI = [
    "function fundJob(address _freelancer) public payable returns (uint256)",
    "function releaseFunds(uint256 _jobId) public"
];

let provider;
let signer;
let userAddress = null;

// DOM Elements
const btnConnect = document.getElementById('connect-wallet');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const walletInfo = document.getElementById('wallet-info');
const walletAddressDisplay = document.getElementById('wallet-address');
const userRoleDisplay = document.getElementById('user-role');
const createJobForm = document.getElementById('create-job-form');
const btnCreateJobText = document.querySelector('#btn-create-job .btn-text');
const btnCreateJobSpinner = document.querySelector('#btn-create-job .spinner');
const btnCreateJob = document.getElementById('btn-create-job');
const jobsContainer = document.getElementById('jobs-container');

// Notifications / Overlays
const toastEl = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');
const overlay = document.getElementById('transaction-overlay');
const overlayTitle = document.getElementById('modal-title');
const overlayDesc = document.getElementById('modal-desc');

function showToast(message) {
    toastMsg.textContent = message;
    toastEl.classList.remove('hidden');
    toastEl.classList.add('show');
    setTimeout(() => {
        toastEl.classList.remove('show');
        setTimeout(() => toastEl.classList.add('hidden'), 400);
    }, 4000);
}

function setOverlay(show, title = '', desc = '') {
    if (show) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            signer = await provider.getSigner();
            userAddress = accounts[0];
            
            // Update UI
            btnConnect.classList.add('hidden');
            walletInfo.classList.remove('hidden');
            walletAddressDisplay.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
            userRoleDisplay.textContent = "Connected";
            
            showToast("Wallet connected successfully ⚡");
            fetchJobs();
        } catch (error) {
            console.error("User denied account access", error);
        }
    } else {
        showToast("Please install MetaMask!");
    }
}

async function fetchJobs() {
    try {
        const response = await fetch(`${API_URL}/jobs`);
        const jobs = await response.json();
        renderJobs(jobs);
    } catch (err) {
        console.error("Failed to fetch jobs", err);
    }
}

function renderJobs(jobs) {
    if (jobs.length === 0) {
        jobsContainer.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon text-muted mb-4 mx-auto block"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                <p>No active contracts found.</p>
                <span class="text-sm text-secondary">Start by creating a new job above.</span>
            </div>
        `;
        return;
    }

    jobsContainer.innerHTML = '';
    
    const myJobs = jobs.filter(j => 
        j.clientAddress.toLowerCase() === userAddress.toLowerCase() || 
        (j.freelancerAddress && j.freelancerAddress.toLowerCase() === userAddress.toLowerCase())
    );

    if (myJobs.length === 0) {
        jobsContainer.innerHTML = `
            <div class="empty-state">
                <p>You have no active contracts.</p>
                <span class="text-sm text-secondary">Awaiting new engagements...</span>
            </div>
        `;
        return;
    }

    myJobs.forEach(job => {
        const isClient = job.clientAddress.toLowerCase() === userAddress.toLowerCase();
        const ticketEl = document.createElement('div');
        ticketEl.className = 'job-ticket';
        
        let actionButton = '';
        if (isClient && job.status === 'FUNDED') {
            actionButton = `<button class="btn btn-outline btn-release" data-id="${job.id}" style="border-color: var(--success); color: var(--success);">Release Payout</button>`;
        } else if (job.status === 'FUNDED') {
            actionButton = `<span class="status-indicator">Locked <span class="dot pulse"></span></span>`;
        } else if (job.status === 'RELEASED') {
            actionButton = `<span class="status-indicator" style="color:var(--success)">Paid <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg></span>`;
        }

        ticketEl.innerHTML = `
            <div class="job-ticket-info">
                <h4>${job.title}</h4>
                <div class="job-ticket-meta mt-2">
                    <span><strong>${job.budget} ETH</strong></span>
                    <span>•</span>
                    <span>${isClient ? 'Client Role' : 'Freelancer Role'}</span>
                </div>
            </div>
            <div class="job-ticket-actions">
                ${actionButton}
            </div>
        `;
        jobsContainer.appendChild(ticketEl);
    });

    // Event Listeners for release
    document.querySelectorAll('.btn-release').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            await releaseFunds(id);
        });
    });
}

async function createJob(e) {
    e.preventDefault();
    if (!userAddress) return showToast("Please connect your wallet first.");

    const title = document.getElementById('job-title').value;
    const freelancerAddress = document.getElementById('freelancer-address').value;
    const budget = document.getElementById('job-budget').value;

    btnCreateJob.disabled = true;
    btnCreateJobText.classList.add('hidden');
    btnCreateJobSpinner.classList.remove('hidden');
    
    setOverlay(true, "Awaiting Smart Contract Deployment", "Please confirm the transaction in your wallet. Do not close this window.");

    try {
        // Simulated Smart Contract Delay for UI
        await new Promise(r => setTimeout(r, 2000)); 

        const response = await fetch(`${API_URL}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title, description: 'Trustless escrow gig', budget,
                clientAddress: userAddress, freelancerAddress
            })
        });
        
        const job = await response.json();
        
        await fetch(`${API_URL}/jobs/${job.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'FUNDED', blockchainJobId: Math.floor(Math.random()*1000) })
        });

        setOverlay(false);
        showToast("Job funded & safely locked in Escrow! 🔒");
        createJobForm.reset();
        fetchJobs();

    } catch (err) {
        console.error(err);
        setOverlay(false);
        showToast("Transaction failed or was dismissed.");
    } finally {
        btnCreateJob.disabled = false;
        btnCreateJobText.classList.remove('hidden');
        btnCreateJobSpinner.classList.add('hidden');
    }
}

async function releaseFunds(jobId) {
    setOverlay(true, "Releasing Escrow", "Confirm payout signature in your wallet.");
    
    try {
        await new Promise(r => setTimeout(r, 1500)); // Simulate tx time

        await fetch(`${API_URL}/jobs/${jobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'RELEASED' })
        });

        setOverlay(false);
        showToast("Payout successfully transferred! 💸");
        fetchJobs();
    } catch (err) {
        console.error(err);
        setOverlay(false);
        showToast("Failed to release funds.");
    }
}

// Theme toggling
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    
    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        document.documentElement.setAttribute('data-theme', 'light');
        setThemeIcon('light');
    } else {
        document.documentElement.removeAttribute('data-theme');
        setThemeIcon('dark');
    }
}

function setThemeIcon(theme) {
    if (theme === 'light') {
        themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    } else {
        themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    }
}

themeToggleBtn.addEventListener('click', () => {
    let currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
        setThemeIcon('dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        setThemeIcon('light');
    }
});

initTheme();

// Bindings
btnConnect.addEventListener('click', connectWallet);
createJobForm.addEventListener('submit', createJob);
