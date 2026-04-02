const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory mock database
const jobs = [];
const users = {}; // Map of address -> Profile data

// Platform Stats
const platformStats = {
    totalValueLocked: 12450.5, // Mock number in ETH
    totalContracts: 342,
    activeFreelancers: 128
};

// Helper to init user profile if missing
function ensureUser(address) {
    const addr = address.toLowerCase();
    if (!users[addr]) {
        users[addr] = {
            address: addr,
            reputationScore: Math.floor(Math.random() * 20) + 80, // Random 80-100 score
            completedJobs: 0,
            activeJobs: 0,
            totalEarned: 0
        };
    }
    return users[addr];
}

// ------ PLATFORM STATS ------
app.get('/api/stats', (req, res) => {
    res.json(platformStats);
});

// ------ PROFILES ------
app.get('/api/users/:address', (req, res) => {
    const profile = ensureUser(req.params.address);
    res.json(profile);
});

// ------ JOBS ------
// Get all jobs
app.get('/api/jobs', (req, res) => {
    res.json(jobs);
});

// Create a new job
app.post('/api/jobs', (req, res) => {
    const { title, description, budget, clientAddress, freelancerAddress } = req.body;
    
    if (!title || !budget || !clientAddress) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    ensureUser(clientAddress);
    if (freelancerAddress) {
        const freelancer = ensureUser(freelancerAddress);
        freelancer.activeJobs += 1;
    }

    const job = {
        id: uuidv4(),
        title,
        description,
        budget: parseFloat(budget),
        clientAddress: clientAddress.toLowerCase(),
        freelancerAddress: freelancerAddress ? freelancerAddress.toLowerCase() : null,
        blockchainJobId: null,
        status: 'OPEN', // OPEN, FUNDED, COMPLETED, RELEASED, DISPUTED
        createdAt: new Date().toISOString()
    };
    
    jobs.push(job);
    platformStats.totalContracts += 1;
    
    res.status(201).json(job);
});

// Update a job
app.put('/api/jobs/:id', (req, res) => {
    const { id } = req.params;
    const { status, blockchainJobId, freelancerAddress } = req.body;
    
    const jobIndex = jobs.findIndex(j => j.id === id);
    if (jobIndex === -1) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    const job = jobs[jobIndex];

    if (status) {
        job.status = status;
        
        // Mock Side Effects
        if (status === 'FUNDED') {
            platformStats.totalValueLocked += job.budget;
        } else if (status === 'RELEASED') {
            platformStats.totalValueLocked -= job.budget;
            if (job.freelancerAddress) {
                const freelancer = ensureUser(job.freelancerAddress);
                freelancer.activeJobs = Math.max(0, freelancer.activeJobs - 1);
                freelancer.completedJobs += 1;
                freelancer.totalEarned += job.budget;
                freelancer.reputationScore = Math.min(100, freelancer.reputationScore + 2); // Boost reputation
            }
        }
    }
    
    if (blockchainJobId !== undefined) job.blockchainJobId = blockchainJobId;
    if (freelancerAddress) job.freelancerAddress = freelancerAddress.toLowerCase();
    
    res.json(job);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Freelock Enterprise backend running on port ${PORT}`);
});
