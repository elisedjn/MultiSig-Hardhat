const { assert } = require('chai');
describe('MultiSig', function () {
  let contract;
  let accounts;
  let _required = 2;

  describe('Confirmed Tests', function () {
    let signer;
    beforeEach(async () => {
      accounts = await ethers.provider.listAccounts();
      const MultiSig = await ethers.getContractFactory('MultiSig');
      contract = await MultiSig.deploy(accounts.slice(0, 3), _required);
      await contract.deployed();
      signer1 = ethers.provider.getSigner(accounts[1]);
    });

    it('should return true if the required threshold is met for a transaction', async function () {
      const value = ethers.utils.parseEther('1');
      await signer1.sendTransaction({ to: contract.address, value });
      await contract.submitTransaction(accounts[1], 100, '0x');

      await contract
        .connect(ethers.provider.getSigner(accounts[1]))
        .confirmTransaction(0);
      const confirmed = await contract.isConfirmed(0);

      assert.equal(confirmed, true);
    });

    it('should return false if the required threshold is not met for a transaction', async function () {
      await contract.submitTransaction(accounts[1], 100, '0x');

      let confirmed = await contract.isConfirmed(0);

      assert.equal(confirmed, false);
    });
  });
});
