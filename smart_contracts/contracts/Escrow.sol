// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Escrow {
    struct Job {
        address client;
        address freelancer;
        uint256 amount;
        bool isFunded;
        bool isReleased;
    }

    mapping(uint256 => Job) public jobs;
    uint256 public jobCount;

    event JobFunded(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount);
    event JobReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount);

    function fundJob(address _freelancer) public payable returns (uint256) {
        require(msg.value > 0, "Must fund with some amount");

        jobCount++;
        uint256 jobId = jobCount;

        jobs[jobId] = Job({
            client: msg.sender,
            freelancer: _freelancer,
            amount: msg.value,
            isFunded: true,
            isReleased: false
        });

        emit JobFunded(jobId, msg.sender, _freelancer, msg.value);
        return jobId;
    }

    function releaseFunds(uint256 _jobId) public {
        Job storage job = jobs[_jobId];
        require(job.isFunded, "Job is not funded");
        require(!job.isReleased, "Funds already released");
        require(msg.sender == job.client, "Only client can release funds");

        job.isReleased = true;
        (bool success, ) = job.freelancer.call{value: job.amount}("");
        require(success, "Transfer failed");

        emit JobReleased(_jobId, job.freelancer, job.amount);
    }
}
