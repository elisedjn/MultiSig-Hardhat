import MultiSig from './artifacts/contracts/MultiSig.sol/MultiSig.json';
import { address } from './__config';
import { ethers } from 'ethers';
import buildTransaction from './transaction';

export default async function populateTransactions(pending) {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const contract = new ethers.Contract(address, MultiSig.abi, provider);
  const code = await provider.getCode(address);
  let transactions = [];
  if (code !== '0x') {
    const transactionIds = await contract.getTransactionIds(pending, !pending);
    for (let i = 0; i < transactionIds.length; i++) {
      let id = transactionIds[i];
      const attributes = await contract.transactions(id);
      const confirmations = await contract.getConfirmations(id);
      transactions.push({ id, attributes, confirmations });
    }
    console.log('TX', transactions);
  }
  renderTransactions(provider, contract, transactions, pending);
}

function renderTransactions(provider, contract, transactions, pending) {
  const container = document.getElementById('container');
  console.log(transactions);
  container.innerHTML =
    `<h1>${pending ? 'Pending' : 'Confirmed'} Transactions</h1>` +
    transactions.map((tx) => buildTransaction(tx, pending)).join('');
  transactions.forEach(({ id }) => {
    document.getElementById(`confirm-${id}`).addEventListener('click', async () => {
      await ethereum.request({ method: 'eth_requestAccounts' });
      const signer = provider.getSigner();
      await contract.connect(signer).confirmTransaction(id);
    });
  });
}
