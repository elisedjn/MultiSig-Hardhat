import setupEvents, { activeTab } from './setupEvents';
import MultiSig from './artifacts/contracts/MultiSig.sol/MultiSig.json';
import { address } from './__config';
import { ethers } from 'ethers';
import './index.css';
import populateTransactions from './populateTransactions';

setupEvents();

async function newTransaction() {
  const provider = new ethers.providers.Web3Provider(ethereum);
  await ethereum.request({ method: 'eth_requestAccounts' });

  const signer = provider.getSigner();
  const contract = new ethers.Contract(address, MultiSig.abi, signer);
  const destination = document.getElementById('destination').value;
  const wei = document.getElementById('wei').value;
  await contract.submitTransaction(destination, wei, '0x');
}

document.getElementById('deploy').addEventListener('click', newTransaction);
document.getElementById('tab-pending').addEventListener('click', () => {
  activeTab = 'pending';
  document.getElementById('tab-pending').classList.remove('inactive');
  document.getElementById('tab-confirmed').classList.add('inactive');
  document.getElementById('tab-expired').classList.add('inactive');
  populateTransactions('pending');
});

document.getElementById('tab-confirmed').addEventListener('click', (elem) => {
  activeTab = 'confirmed';
  document.getElementById('tab-confirmed').classList.remove('inactive');
  document.getElementById('tab-pending').classList.add('inactive');
  document.getElementById('tab-expired').classList.add('inactive');
  populateTransactions('confirmed');
});

document.getElementById('tab-confirmed').addEventListener('click', (elem) => {
  activeTab = 'expired';
  document.getElementById('tab-confirmed').classList.add('inactive');
  document.getElementById('tab-pending').classList.add('inactive');
  document.getElementById('tab-expired').classList.remove('inactive');
  populateTransactions('expired');
});
