import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import {useEffect, useRef, useState} from "react";
import {REPUBLICDEVS_DAO_ABI, REPUBLICDEVS_DAO_CONTRACT_ADDRESS} from "../constants/RepublicDevs_DAO";
import {Contract, providers} from "ethers";
import {REPUBLICDEVS_NFT_ABI, REPUBLICDEVS_NFT_CONTRACT_ADDRESS} from "../constants/RepublicDevs_NFT";
import Web3Modal from "web3modal"
import {formatEther} from "ethers/lib/utils";

export default function Home() {

    const [treasuryBalance, setTreasuryBalance] = useState("0")
    const [numProposals, setNumProposals] = useState(0)
    const [proposals, setProposals] = useState<any[]>([])
    const [nftBalance, setNftBalance] = useState(0)
    const [nftTokenId, setNftTokenId] = useState("")
    const [selectedTab, setSelectedTab] = useState("")
    const [loading, setLoading] = useState(false)
    const [walletConnected, setWalletConnected] = useState(false)

    const web3ModalRef = useRef()

    const connectWallet = async () => {
        try {
            await getProviderOrSigner()
            setWalletConnected(true)
        } catch (error) {
            console.error(error)
        }
    }

    const getDAOTreasuryBalance = async () => {
        try {
            const provider = await getProviderOrSigner();
            const balance = await provider.getBalance(
                REPUBLICDEVS_DAO_CONTRACT_ADDRESS
            )
            setTreasuryBalance(balance.toString())
        } catch (error) {
            console.error(error)
        }
    }

    const getNumProposalsInDAO = async () => {
        try {
            const provider = await getProviderOrSigner();
            const contract = getDaoContractInstance(provider);
            const daoNumProposals = await contract.numProposals();
            setNumProposals(daoNumProposals.toString())
        } catch (error) {
            console.error(error)
        }
    }

    const getUserNFTBalance = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const nftContract = getRepublicdevsNFTContractInstance(signer);
            const balance = await nftContract.balanceOf(signer.getAddress());
            setNftBalance(parseInt(balance.toString()));
        } catch (error) {
            console.error(error)
        }
    }

    const createProposal = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const daoContract = getDaoContractInstance(signer);
            const txn = await daoContract.createProposal(nftTokenId);
            setLoading(true);
            await txn.wait();
            await getNumProposalsInDAO();
            setLoading(false)
        } catch (error) {
            console.error(error)
            // @ts-ignore
            window.alert(error.data.message);
        }
    }

    const fetchProposalById = async (id: any) => {
        try {
            const provider = await getProviderOrSigner();
            const daoContract = getDaoContractInstance(provider);
            const proposal = await daoContract.proposals(id);
            const parsedProposal = {
                proposalId: id,
                nftTokenId: proposal.nftTokenid.toString(),
                deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
                yayVotes: proposal.yayVotes.toString(),
                nayVotes: proposal.nayVotes.toString(),
                executed: proposal.executed,
            };
            return parsedProposal
        } catch (error) {
            console.error(error)
        }
    }

    const fetchAllProposals = async () => {
        try {
            const proposals = []
            for (let i = 0; i < numProposals; i++) {
                const proposal = await fetchProposalById(i);
                proposals.push(proposal);
            }
            setProposals(proposals);
            return proposals
        } catch (error) {
            console.error(error)
        }
    }

    const voteOnProposal = async (proposalId: any, _vote: any) => {
        try {
            const signer = await getProviderOrSigner(true);
            const daoContract = getDaoContractInstance(signer);

            let vote = _vote === "YAY" ? 0 : 1
            const transaction = await daoContract.voteOnProposal(proposalId, vote);
            setLoading(true)
            await transaction.wait()
            setLoading(false)
            await fetchAllProposals()
        } catch (error) {
            console.error(error)
        }
    }

    const executeProposal = async (proposalId: string) => {
        try {
            const signer = await getProviderOrSigner(true)
            const daoContract = getDaoContractInstance(signer);
            const transaction = await daoContract.executeProposal(proposalId)
            setLoading(true)
            await transaction.wait()
            setLoading(false)
            await fetchAllProposals()
        } catch (error) {
            console.error(error)
        }
    }

    const getProviderOrSigner = async (needSigner = false) => {
        // @ts-ignore
        const provider = await web3ModalRef.current.connect();
        const web3Provider = new providers.Web3Provider(provider);

        const {chainId} = await web3Provider.getNetwork()
        if(chainId !==5) {
            window.alert("Switch to Goerli")
            throw new Error("Switch to Goerli")
        }

        if (needSigner) {
            const signer = web3Provider.getSigner();
            return signer;
        }

        return web3Provider;
    }

    const getDaoContractInstance = (providerOrSigner: any) => {
        return new Contract(
            REPUBLICDEVS_DAO_CONTRACT_ADDRESS,
            REPUBLICDEVS_DAO_ABI,
            providerOrSigner
        )
    }

    const getRepublicdevsNFTContractInstance = (providerOrSigner: any) => {
        return new Contract(
            REPUBLICDEVS_NFT_CONTRACT_ADDRESS,
            REPUBLICDEVS_NFT_ABI,
            providerOrSigner
        )
    }

    useEffect(() => {
        if(!walletConnected) {
            // @ts-ignore
            web3ModalRef.current = new Web3Modal({
                network: "goerli",
                providerOptions: {},
                disableInjectedProvider: false,
            })

            connectWallet().then( () => {
                getDAOTreasuryBalance();
                getUserNFTBalance();
                getNumProposalsInDAO();
            })
        }
    },[walletConnected])

    useEffect(() => {
        if(selectedTab === "View Proposals") {
            fetchAllProposals()
        }
    }, [selectedTab])
    // Render the contents of the appropriate tab based on `selectedTab`
    function renderTabs() {
        if (selectedTab === "Create Proposal") {
            return renderCreateProposalTab();
        } else if (selectedTab === "View Proposals") {
            return renderViewProposalsTab();
        }
        return null;
    }

    // Renders the 'Create Proposal' tab content
    function renderCreateProposalTab() {
        if (loading) {
            return (
                <div className={styles.description}>
                    Loading... Waiting for transaction...
                </div>
            );
        } else if (nftBalance === 0) {
            return (
                <div className={styles.description}>
                    You do not own any CryptoDevs NFTs. <br />
                    <b>You cannot create or vote on proposals</b>
                </div>
            );
        } else {
            return (
                <div className={styles.container}>
                    <label>Fake NFT Token ID to Purchase: </label>
                    <input
                        placeholder="0"
                        type="number"
                        onChange={(e) => setNftTokenId(e.target.value)}
                    />
                    <button className={styles.button2} onClick={createProposal}>
                        Create
                    </button>
                </div>
            );
        }
    }

    // Renders the 'View Proposals' tab content
    function renderViewProposalsTab() {
        if (loading) {
            return (
                <div className={styles.description}>
                    Loading... Waiting for transaction...
                </div>
            );
        } else if (proposals.length === 0) {
            return (
                <div className={styles.description}>No proposals have been created</div>
            );
        } else {
            return (
                <div>
                    {proposals.map((p, index) => (
                        <div key={index} className={styles.proposalCard}>
                            <p>Proposal ID: {p.proposalId}</p>
                            <p>Fake NFT to Purchase: {p.nftTokenId}</p>
                            <p>Deadline: {p.deadline.toLocaleString()}</p>
                            <p>Yay Votes: {p.yayVotes}</p>
                            <p>Nay Votes: {p.nayVotes}</p>
                            <p>Executed?: {p.executed.toString()}</p>
                            {p.deadline.getTime() > Date.now() && !p.executed ? (
                                <div className={styles.flex}>
                                    <button
                                        className={styles.button2}
                                        onClick={() => voteOnProposal(p.proposalId, "YAY")}
                                    >
                                        Vote YAY
                                    </button>
                                    <button
                                        className={styles.button2}
                                        onClick={() => voteOnProposal(p.proposalId, "NAY")}
                                    >
                                        Vote NAY
                                    </button>
                                </div>
                            ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                                <div className={styles.flex}>
                                    <button
                                        className={styles.button2}
                                        onClick={() => executeProposal(p.proposalId)}
                                    >
                                        Execute Proposal{" "}
                                        {p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.description}>Proposal Executed</div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }
    }

    return (
        <div>
            <Head>
                <title>CryptoDevs DAO</title>
                <meta name="description" content="CryptoDevs DAO" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className={styles.main}>
                <div>
                    <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
                    <div className={styles.description}>Welcome to the DAO!</div>
                    <div className={styles.description}>
                        Your CryptoDevs NFT Balance: {nftBalance}
                        <br />
                        Treasury Balance: {formatEther(treasuryBalance)} ETH
                        <br />
                        Total Number of Proposals: {numProposals}
                    </div>
                    <div className={styles.flex}>
                        <button
                            className={styles.button}
                            onClick={() => setSelectedTab("Create Proposal")}
                        >
                            Create Proposal
                        </button>
                        <button
                            className={styles.button}
                            onClick={() => setSelectedTab("View Proposals")}
                        >
                            View Proposals
                        </button>
                    </div>
                    {renderTabs()}
                </div>
                <div>
                    <img className={styles.image} src="/cryptodevs/0.svg" />
                </div>
            </div>

            <footer className={styles.footer}>
                Made with &#10084; by Crypto Devs
            </footer>
        </div>
    );
}
