// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFakeNFTMarketplace {
    function getPrice() external view returns (uint256);

    function available(uint256 _tokenId) external view returns (bool);

    function purchase(uint256 _tokenId) external payable;
}

// Need to go back to CryptoDevsNFT
interface IRepublicDevsNFT {
    function balanceOf(address owner) external view returns (uint256);

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
}

import "@openzeppelin/contracts/access/Ownable.sol";

contract RepublicDao is Ownable {

    enum Vote {
        YAY, // Yay = 0
        NAY // Nay = 1
    }

    struct Proposal {
        uint256 nftTokenId;
        uint256 deadline;
        uint256 yayVotes;
        uint256 nayVotes;
        bool executed;
        mapping(uint256 => bool) voters;
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 numberProposals;

    IFakeNFTMarketplace nftMarketplace;
    IRepublicDevsNFT republicDevsNFT;

    modifier nftHolderOnly() {
        require(republicDevsNFT.balanceOf(msg.sender) > 0, "NOT_A_DAO_MEMBER");
        _;
    }

    modifier activeProposalOnly(uint256 proposalIndex) {
        require(proposals[proposalIndex].deadline > block.timestamp, "DEADLINE_EXCEEDED");
        _;
    }

    modifier inactiveProposalOnly(uint256 proposalIndex) {
        require(
            proposals[proposalIndex].deadline <= block.timestamp, "DEADLINE_NOT_EXCEEDED"
        );
        require(
            proposals[proposalIndex].executed == false, "PROPOSAL_ALREADY_EXECUTED"
        );
        _;
    }

    constructor(address _nftMarketplace, address _republicDevsNFT) payable {
        nftMarketplace = IFakeNFTMarketplace(_nftMarketplace);
        republicDevsNFT = IRepublicDevsNFT(_republicDevsNFT);
    }

    receive() external payable {}
    fallback() external payable {}

    function createProposal(uint256 _nftTokenId) external nftHolderOnly returns (uint256) {
        require(nftMarketplace.available(_nftTokenId), "NFT_NOT_FOR_SALE");
        Proposal storage proposal = proposals[numberProposals];
        proposal.nftTokenId = _nftTokenId;
        proposal.deadline = block.timestamp + 5 minutes;

        numberProposals++;

        return numberProposals - 1;
    }

    function voteOnProposal(uint256 proposalIndex, Vote vote) external nftHolderOnly activeProposalOnly(proposalIndex) {
        Proposal storage proposal = proposals[proposalIndex];

        uint256 voterNFTBalance = republicDevsNFT.balanceOf(msg.sender);
        uint256 numberVotes = 0;

        for (uint256 i = 0; i < voterNFTBalance; i++) {
            uint256 tokenId = republicDevsNFT.tokenOfOwnerByIndex(msg.sender, i);
            if (proposal.voters[tokenId] == false) {
                numberVotes++;
                proposal.voters[tokenId] = true;
            }
        }

        require(numberVotes > 0, "ALREADY_VOTED");

        if (vote == Vote.YAY) {
            proposal.yayVotes += numberVotes;
        } else {
            proposal.nayVotes += numberVotes;
        }
    }

    function executeProposal(uint256 proposalIndex) external nftHolderOnly inactiveProposalOnly(proposalIndex) {
        Proposal storage proposal = proposals[proposalIndex];

        if(proposal.yayVotes > proposal.nayVotes) {
            uint256 nftPrice = nftMarketplace.getPrice();
            require(address(this).balance >= nftPrice, "NOT-ENOUGH_FUNDS");
            nftMarketplace.purchase{value: nftPrice}(proposal.nftTokenId);
        }

        proposal.executed = true;
    }

    function withdrawEther() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
