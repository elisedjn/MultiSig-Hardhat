const { assert } = require('chai');
const { randomBytes } = require('ethers/lib/utils');
describe('MultiSig', function () {
  let contract;
  let accounts, signer1;
  let _required = 2;
  let beforeBalance;
  beforeEach(async () => {
    accounts = await ethers.provider.listAccounts();
    const MultiSig = await ethers.getContractFactory('MultiSig');
    contract = await MultiSig.deploy(accounts.slice(0, 3), _required, 5);
    await contract.deployed();
    signer1 = ethers.provider.getSigner(accounts[1]);
    beforeBalance = await ethers.provider.getBalance(accounts[2]);
  });

  describe('after depositing and submitting a transaction', () => {
    const transferAmount = ethers.utils.parseEther('0.5');
    beforeEach(async () => {
      await signer1.sendTransaction({
        to: contract.address,
        value: transferAmount.mul(2),
      });
      await contract.submitTransaction(accounts[2], transferAmount, '0x');
    });

    it('should not execute transaction yet', async () => {
      const txn = await contract.callStatic.transactions(0);
      assert(!txn.executed);
    });

    it('should not update the beneficiary balance', async () => {
      const afterBalance = await ethers.provider.getBalance(accounts[2]);
      assert.equal(afterBalance.toString(), beforeBalance.toString());
    });

    describe('after confirming', () => {
      beforeEach(async () => {
        await contract.connect(signer1).confirmTransaction(0);
      });

      it('should try to execute transaction after confirming', async () => {
        const txn = await contract.callStatic.transactions(0);
        assert(txn.executed);
      });

      it('should update the beneficiary balance', async () => {
        const afterBalance = await ethers.provider.getBalance(accounts[2]);
        assert.equal(
          afterBalance.sub(beforeBalance).toString(),
          transferAmount.toString()
        );
      });
    });
  });

  describe('Transaction Count', function () {
    beforeEach(async () => {
      const value = ethers.utils.parseEther('1');
      const transferValue = ethers.utils.parseEther('.5');
      await signer1.sendTransaction({ to: contract.address, value });

      // make 4
      await contract.submitTransaction(accounts[1], transferValue, '0x');
      await contract.submitTransaction(accounts[1], transferValue, '0x');
      await contract.submitTransaction(accounts[1], transferValue, '0x');
      await contract.submitTransaction(accounts[1], transferValue, '0x');

      // confirm 1
      await contract.connect(signer1).confirmTransaction(0);
    });

    it('should return the count of pending transactions', async function () {
      const count = await contract.getTransactionCount(true, false, false);
      assert.equal(count.toNumber(), 3);
    });

    it('should return the count of executed transactions', async function () {
      const count = await contract.getTransactionCount(false, true, false);
      assert.equal(count.toNumber(), 1);
    });

    it('should return the count of both', async function () {
      const count = await contract.getTransactionCount(true, true, false);
      assert.equal(count.toNumber(), 4);
    });
  });

  describe('Execute Transaction Tests', function () {
    beforeEach(async () => {
      const value = ethers.utils.parseEther('1');
      const transferValue = ethers.utils.parseEther('.5');
      await signer1.sendTransaction({ to: contract.address, value });

      // make 4
      await contract.submitTransaction(accounts[1], transferValue, '0x');
      await contract.submitTransaction(accounts[1], transferValue, '0x');
      await contract.submitTransaction(accounts[1], transferValue, '0x');
      await contract.submitTransaction(accounts[1], transferValue, '0x');

      // confirm 1
      await contract.connect(signer1).confirmTransaction(0);
    });

    it('should return a list of pending transactions', async function () {
      const arr = await contract.getTransactionIds(true, false, false);
      assert.equal(arr.length, 3);
    });

    it('should return a list of executed transactions', async function () {
      const arr = await contract.getTransactionIds(false, true, false);
      assert.equal(arr.length, 1);
    });

    it('should return a list of both', async function () {
      const arr = await contract.getTransactionIds(true, true, false);
      assert.equal(arr.length, 4);
    });
  });

  describe('Execute Transaction Tests', function () {
    beforeEach(async () => {
      accounts = await ethers.provider.listAccounts();
      const MultiSig = await ethers.getContractFactory('MultiSig');
      contract = await MultiSig.deploy(accounts.slice(0, 3), _required, 5);
      await contract.deployed();
      signer1 = ethers.provider.getSigner(accounts[1]);
    });

    it('should execute a transaction if confirmation threshold is met', async function () {
      const value = ethers.utils.parseEther('1');
      await signer1.sendTransaction({ to: contract.address, value });
      await contract.submitTransaction(accounts[1], ethers.utils.parseEther('.5'), '0x');
      await contract.connect(signer1).confirmTransaction(0);
      let txn = await contract.callStatic.transactions(0);
      assert.equal(txn[2], true, 'Expected `executed` bool to be true!');
    });

    it('should not execute a transaction if confirmation threshold is not met', async function () {
      const value = ethers.utils.parseEther('1');
      await signer1.sendTransaction({ to: contract.address, value });
      await contract.submitTransaction(accounts[1], ethers.utils.parseEther('.5'), '0x');

      await expectThrow(contract.executeTransaction(0));
    });

    it('should transfer funds to the beneficiary', async function () {
      const value = ethers.utils.parseEther('1');
      const transferValue = ethers.utils.parseEther('.5');
      const recipient = accounts[2];

      const balanceBefore1 = await ethers.provider.getBalance(recipient);
      const contractBalanceBefore = await ethers.provider.getBalance(contract.address);

      await signer1.sendTransaction({ to: contract.address, value });
      await contract.submitTransaction(recipient, transferValue, '0x');
      await contract.connect(signer1).confirmTransaction(0);

      const balanceAfter = await ethers.provider.getBalance(recipient);
      const contractBalanceAfter = await ethers.provider.getBalance(contract.address);

      assert.equal(balanceAfter.sub(balanceBefore1).toString(), transferValue.toString());
      assert.equal(
        contractBalanceAfter.sub(contractBalanceBefore).toString(),
        transferValue.toString()
      );
    });

    it('should only allow valid owners to execute', async function () {
      const value = ethers.utils.parseEther('1');
      const transferValue = ethers.utils.parseEther('.5');
      await signer1.sendTransaction({ to: contract.address, value });
      await contract.submitTransaction(accounts[1], transferValue, '0x');
      await expectThrow(
        contract.connect(ethers.provider.getSigner(6)).executeTransaction(0)
      );
    });
  });
});

async function expectThrow(promise) {
  try {
    await promise;
  } catch (err) {
    return;
  }
  assert(false, 'Expected the transaction to revert!');
}
