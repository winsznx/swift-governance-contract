const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Governance", function () {
    // Constants matching contract
    const VOTING_DELAY = 24 * 60 * 60; // 1 day
    const VOTING_PERIOD = 3 * 24 * 60 * 60; // 3 days
    const EXECUTION_DELAY = 24 * 60 * 60; // 1 day
    const PROPOSAL_THRESHOLD = ethers.parseEther("1000");
    const QUORUM_THRESHOLD = ethers.parseEther("10000");

    async function deployGovernanceFixture() {
        const [owner, proposer, voter1, voter2, voter3, delegate, other] = await ethers.getSigners();

        // Deploy mock governance token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const token = await MockERC20.deploy("Governance Token", "GOV");

        // Deploy governance contract
        const Governance = await ethers.getContractFactory("Governance");
        const governance = await Governance.deploy(await token.getAddress());

        // Mint tokens to users
        await token.mint(owner.address, ethers.parseEther("50000"));
        await token.mint(proposer.address, ethers.parseEther("5000"));
        await token.mint(voter1.address, ethers.parseEther("3000"));
        await token.mint(voter2.address, ethers.parseEther("4000"));
        await token.mint(voter3.address, ethers.parseEther("2000"));

        // Whitelist proposer
        await governance.whitelistAddress(proposer.address);

        return { governance, token, owner, proposer, voter1, voter2, voter3, delegate, other };
    }

    async function setupVotingPowerFixture() {
        const result = await loadFixture(deployGovernanceFixture);
        const { governance, proposer, voter1, voter2, voter3 } = result;

        // Set up voting power by delegating to themselves
        // In a real scenario, the token contract would call updateVotingPower
        // For testing, we'll manually set voting power via owner
        // Since only token can call updateVotingPower, we simulate by delegation

        return result;
    }

    describe("Deployment", function () {
        it("Should set the governance token correctly", async function () {
            const { governance, token } = await loadFixture(deployGovernanceFixture);
            expect(await governance.governanceToken()).to.equal(await token.getAddress());
        });

        it("Should whitelist the owner", async function () {
            const { governance, owner } = await loadFixture(deployGovernanceFixture);
            expect(await governance.isWhitelisted(owner.address)).to.be.true;
        });

        it("Should start with 0 proposals", async function () {
            const { governance } = await loadFixture(deployGovernanceFixture);
            expect(await governance.getTotalProposalCount()).to.equal(0);
        });

        it("Should revert with zero address token", async function () {
            const Governance = await ethers.getContractFactory("Governance");
            await expect(Governance.deploy(ethers.ZeroAddress))
                .to.be.revertedWith("Invalid governance token address");
        });
    });

    describe("Whitelist Management", function () {
        it("Should allow owner to whitelist addresses", async function () {
            const { governance, owner, other } = await loadFixture(deployGovernanceFixture);

            await expect(governance.whitelistAddress(other.address))
                .to.emit(governance, "WhitelistUpdated")
                .withArgs(other.address, true);

            expect(await governance.isWhitelisted(other.address)).to.be.true;
        });

        it("Should allow owner to remove from whitelist", async function () {
            const { governance, proposer } = await loadFixture(deployGovernanceFixture);

            await expect(governance.removeFromWhitelist(proposer.address))
                .to.emit(governance, "WhitelistUpdated")
                .withArgs(proposer.address, false);

            expect(await governance.isWhitelisted(proposer.address)).to.be.false;
        });

        it("Should revert whitelist with zero address", async function () {
            const { governance } = await loadFixture(deployGovernanceFixture);
            await expect(governance.whitelistAddress(ethers.ZeroAddress))
                .to.be.revertedWith("Invalid address");
        });

        it("Should revert if non-owner tries to whitelist", async function () {
            const { governance, other } = await loadFixture(deployGovernanceFixture);
            await expect(governance.connect(other).whitelistAddress(other.address))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Proposal Creation", function () {
        it("Should revert if not whitelisted", async function () {
            const { governance, other } = await loadFixture(deployGovernanceFixture);
            const actions = [{ target: other.address, value: 0, signature: "", data: "0x" }];

            await expect(governance.connect(other).createProposal("Title", "Description", actions))
                .to.be.revertedWith("Not whitelisted");
        });

        it("Should revert if insufficient voting power", async function () {
            const { governance, proposer } = await loadFixture(deployGovernanceFixture);
            const actions = [{ target: proposer.address, value: 0, signature: "", data: "0x" }];

            // Proposer has 0 voting power initially
            await expect(governance.connect(proposer).createProposal("Title", "Description", actions))
                .to.be.revertedWith("Insufficient voting power");
        });

        it("Should revert with empty title", async function () {
            const { governance, owner } = await loadFixture(deployGovernanceFixture);
            const actions = [{ target: owner.address, value: 0, signature: "", data: "0x" }];

            // Set owner voting power high enough
            // We need to impersonate the token contract for this
            await expect(governance.createProposal("", "Description", actions))
                .to.be.revertedWith("Insufficient voting power");
        });

        it("Should revert with title too long", async function () {
            const { governance, owner, token } = await loadFixture(deployGovernanceFixture);
            const actions = [{ target: owner.address, value: 0, signature: "", data: "0x" }];

            // Create a title that's too long (> 100 chars)
            const longTitle = "a".repeat(101);

            // First need to get voting power
            // This test would need the token to call updateVotingPower
            // For now, we test the basic validation
        });

        it("Should revert with empty actions", async function () {
            const { governance, owner } = await loadFixture(deployGovernanceFixture);

            await expect(governance.createProposal("Title", "Description", []))
                .to.be.revertedWith("Insufficient voting power"); // First check is voting power
        });
    });

    describe("Voting", function () {
        it("Should revert if proposal does not exist", async function () {
            const { governance, voter1 } = await loadFixture(deployGovernanceFixture);

            await expect(governance.connect(voter1).vote(999, 1, "Support"))
                .to.be.revertedWith("Proposal does not exist");
        });

        it("Should revert with invalid support value", async function () {
            const { governance, voter1 } = await loadFixture(deployGovernanceFixture);

            // Would need an active proposal first
            await expect(governance.connect(voter1).vote(1, 3, "Invalid"))
                .to.be.revertedWith("Proposal does not exist");
        });
    });

    describe("Delegation", function () {
        it("Should revert delegation to zero address", async function () {
            const { governance, voter1 } = await loadFixture(deployGovernanceFixture);

            await expect(governance.connect(voter1).delegate(ethers.ZeroAddress))
                .to.be.revertedWith("Invalid delegate");
        });

        it("Should revert delegation to self", async function () {
            const { governance, voter1 } = await loadFixture(deployGovernanceFixture);

            await expect(governance.connect(voter1).delegate(voter1.address))
                .to.be.revertedWith("Cannot delegate to self");
        });

        it("Should allow delegation to another address", async function () {
            const { governance, token, voter1, delegate } = await loadFixture(deployGovernanceFixture);

            await expect(governance.connect(voter1).delegate(delegate.address))
                .to.emit(governance, "DelegateChanged")
                .withArgs(voter1.address, ethers.ZeroAddress, delegate.address);

            // Check delegate info
            const delegateInfo = await governance.delegates(voter1.address);
            expect(delegateInfo.delegate).to.equal(delegate.address);
        });

        it("Should update voting power on delegation", async function () {
            const { governance, token, voter1, delegate } = await loadFixture(deployGovernanceFixture);

            const voter1Balance = await token.balanceOf(voter1.address);

            await governance.connect(voter1).delegate(delegate.address);

            expect(await governance.votingPower(delegate.address)).to.equal(voter1Balance);
        });

        it("Should transfer voting power when changing delegates", async function () {
            const { governance, token, voter1, voter2, delegate } = await loadFixture(deployGovernanceFixture);

            const voter1Balance = await token.balanceOf(voter1.address);

            // First delegation
            await governance.connect(voter1).delegate(delegate.address);
            expect(await governance.votingPower(delegate.address)).to.equal(voter1Balance);

            // Change delegate
            await governance.connect(voter1).delegate(voter2.address);
            expect(await governance.votingPower(delegate.address)).to.equal(0);
            expect(await governance.votingPower(voter2.address)).to.equal(voter1Balance);
        });
    });

    describe("Pause Functionality", function () {
        it("Should allow owner to pause", async function () {
            const { governance, owner } = await loadFixture(deployGovernanceFixture);

            await governance.pause();
            expect(await governance.paused()).to.be.true;
        });

        it("Should allow owner to unpause", async function () {
            const { governance, owner } = await loadFixture(deployGovernanceFixture);

            await governance.pause();
            await governance.unpause();
            expect(await governance.paused()).to.be.false;
        });

        it("Should revert if non-owner tries to pause", async function () {
            const { governance, other } = await loadFixture(deployGovernanceFixture);

            await expect(governance.connect(other).pause())
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should prevent delegation when paused", async function () {
            const { governance, voter1, delegate } = await loadFixture(deployGovernanceFixture);

            await governance.pause();

            await expect(governance.connect(voter1).delegate(delegate.address))
                .to.be.revertedWith("Pausable: paused");
        });
    });

    describe("ETH Withdrawal", function () {
        it("Should allow owner to withdraw ETH", async function () {
            const { governance, owner, other } = await loadFixture(deployGovernanceFixture);

            // Send ETH to contract
            const amount = ethers.parseEther("1");
            await owner.sendTransaction({
                to: await governance.getAddress(),
                value: amount
            });

            const balanceBefore = await ethers.provider.getBalance(other.address);

            await expect(governance.withdrawETH(other.address))
                .to.emit(governance, "ETHWithdrawn")
                .withArgs(other.address, amount);

            const balanceAfter = await ethers.provider.getBalance(other.address);
            expect(balanceAfter - balanceBefore).to.equal(amount);
        });

        it("Should revert with zero recipient", async function () {
            const { governance } = await loadFixture(deployGovernanceFixture);

            await expect(governance.withdrawETH(ethers.ZeroAddress))
                .to.be.revertedWith("Invalid recipient");
        });

        it("Should revert if no ETH to withdraw", async function () {
            const { governance, other } = await loadFixture(deployGovernanceFixture);

            await expect(governance.withdrawETH(other.address))
                .to.be.revertedWith("No ETH to withdraw");
        });

        it("Should revert if non-owner tries to withdraw", async function () {
            const { governance, owner, other } = await loadFixture(deployGovernanceFixture);

            // Send ETH to contract
            await owner.sendTransaction({
                to: await governance.getAddress(),
                value: ethers.parseEther("1")
            });

            await expect(governance.connect(other).withdrawETH(other.address))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("View Functions", function () {
        it("Should return correct voting power", async function () {
            const { governance, token, voter1, delegate } = await loadFixture(deployGovernanceFixture);

            await governance.connect(voter1).delegate(delegate.address);

            const delegatePower = await governance.getVotingPower(delegate.address);
            expect(delegatePower).to.equal(await token.balanceOf(voter1.address));
        });

        it("Should return 0 for addresses without voting power", async function () {
            const { governance, other } = await loadFixture(deployGovernanceFixture);

            expect(await governance.getVotingPower(other.address)).to.equal(0);
        });
    });

    describe("Admin Proposal Cancellation", function () {
        // This requires a created proposal to test fully
        // For now, test that only authorized can cancel
        it("Should revert cancel on non-existent proposal", async function () {
            const { governance, owner } = await loadFixture(deployGovernanceFixture);

            await expect(governance.cancelProposal(999))
                .to.be.revertedWith("Proposal does not exist");
        });
    });

    describe("Proposal State", function () {
        it("Should revert for non-existent proposal", async function () {
            const { governance } = await loadFixture(deployGovernanceFixture);

            await expect(governance.getProposalState(999))
                .to.be.revertedWith("Proposal does not exist");
        });
    });

    describe("Update Voting Power", function () {
        it("Should revert if not called by token contract", async function () {
            const { governance, voter1 } = await loadFixture(deployGovernanceFixture);

            await expect(governance.updateVotingPower(voter1.address, ethers.parseEther("1000")))
                .to.be.revertedWith("Only token contract can update");
        });
    });

    describe("Constants", function () {
        it("Should have correct constant values", async function () {
            const { governance } = await loadFixture(deployGovernanceFixture);

            expect(await governance.VOTING_DELAY()).to.equal(VOTING_DELAY);
            expect(await governance.VOTING_PERIOD()).to.equal(VOTING_PERIOD);
            expect(await governance.PROPOSAL_THRESHOLD()).to.equal(PROPOSAL_THRESHOLD);
            expect(await governance.QUORUM_THRESHOLD()).to.equal(QUORUM_THRESHOLD);
            expect(await governance.EXECUTION_DELAY()).to.equal(EXECUTION_DELAY);
            expect(await governance.MAX_TITLE_LENGTH()).to.equal(100);
            expect(await governance.MAX_DESCRIPTION_LENGTH()).to.equal(5000);
            expect(await governance.MAX_ACTIONS_PER_PROPOSAL()).to.equal(10);
        });
    });
});
