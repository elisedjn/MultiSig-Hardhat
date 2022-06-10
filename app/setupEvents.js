import populateTransactions from './populateTransactions';
import populateInfo from './populateInfo';
import MultiSig from './artifacts/contracts/MultiSig.sol/MultiSig.json';
import { address } from './__config';
import { ethers } from 'ethers';

export let activeTab = 'pending';

export default async function setupEvents() {
  const provider = new ethers.providers.Web3Provider(ethereum);
  await ethereum.request({ method: 'eth_requestAccounts' });

  const signer = provider.getSigner();
  const contract = new ethers.Contract(address, MultiSig.abi, signer);

  populateTransactions(activeTab);
  populateInfo();

  const code = await provider.getCode(address);
  if (code !== '0x') {
    contract.on('Confirmation', () => {
      populateTransactions(activeTab);
    });
    contract.on('Submission', () => {
      populateTransactions(activeTab);
    });
    contract.on('Execution', () => {
      populateTransactions(activeTab);
      populateInfo();
    });
    contract.on('Deposit', () => {
      populateInfo();
    });
  }
}

ethereum.on('chainChanged', () => {
  setupEvents();
});
