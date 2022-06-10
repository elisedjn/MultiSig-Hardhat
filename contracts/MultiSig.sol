// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;

contract MultiSig {
    address[] public owners;
    uint256 public transactionCount;
    uint256 public required;
    uint256 public minutesExp;

    event Confirmation(address indexed sender, uint256 indexed transactionId);
    event Submission(uint256 indexed transactionId);
    event Execution(uint256 indexed transactionId);
    event Deposit(address indexed sender, uint256 value);

    struct Transaction {
        address destination;
        uint256 value;
        bool executed;
        bool expired;
        uint256 timestamp;
        bytes data;
    }

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;

    constructor(
        address[] memory _owners,
        uint256 _confirmations,
        uint256 _minutesExp
    ) {
        require(_owners.length > 0, "There should be at least one owner");
        require(_confirmations > 0, "At least one confirmation is required");
        require(
            _confirmations <= _owners.length,
            "Required confirmations can't be higher than number of owners"
        );
        require(_minutesExp > 0, "Expiration time must be more than 0 minutes");
        owners = _owners;
        required = _confirmations;
        minutesExp = _minutesExp;
    }

    //Transactions
    function addTransaction(
        address _destination,
        uint256 _value,
        bytes memory _data
    ) internal returns (uint256) {
        transactions.push(
            Transaction(
                _destination,
                _value,
                false,
                false,
                block.timestamp,
                _data
            )
        );
        transactionCount = transactions.length;
        return transactions.length - 1;
    }

    function confirmTransaction(uint256 _id) public onlyOwners {
        if (
            (transactions[_id].timestamp + (minutesExp * 1 minutes)) <
            block.timestamp
        ) {
            transactions[_id].expired = true;
        }
        require(!transactions[_id].expired, "This transaction has expired");
        confirmations[_id][msg.sender] = true;
        emit Confirmation(msg.sender, _id);
        if (isConfirmed(_id)) {
            executeTransaction(_id);
        }
    }

    function executeTransaction(uint256 _id) public onlyOwners {
        require(isConfirmed(_id), "Not enough confirmations");
        require(!transactions[_id].expired, "This transaction has expired");
        require(!transactions[_id].executed, "Transaction already executed");
        emit Execution(_id);
        transactions[_id].executed = true;
        (bool sent, ) = transactions[_id].destination.call{
            value: transactions[_id].value
        }(transactions[_id].data);
        require(sent, "Failed to send Ether");
    }

    function submitTransaction(
        address _destination,
        uint256 _value,
        bytes memory _data
    ) external onlyOwners {
        uint256 newId = addTransaction(_destination, _value, _data);
        confirmTransaction(newId);
        emit Submission(newId);
    }

    function getTransactionCount(
        bool _pending,
        bool _executed,
        bool _expired
    ) public view returns (uint256) {
        uint256 count;
        for (uint256 i = 0; i < transactions.length; i++) {
            if (
                (_pending &&
                    !transactions[i].executed &&
                    !transactions[i].expired) ||
                (_executed && transactions[i].executed) ||
                (_expired && transactions[i].expired)
            ) {
                count++;
            }
        }
        return count;
    }

    function getTransactionIds(
        bool _pending,
        bool _executed,
        bool _expired
    ) external view returns (uint256[] memory) {
        uint256 count = getTransactionCount(_pending, _executed, _expired);
        uint256[] memory txIds = new uint256[](count);
        uint256 j;
        for (uint256 i = 0; i < transactions.length; i++) {
            if (
                (_pending &&
                    !transactions[i].executed &&
                    !transactions[i].expired) ||
                (_executed && transactions[i].executed) ||
                (_expired && transactions[i].expired)
            ) {
                txIds[j] = i;
                j++;
            }
        }
        return txIds;
    }

    //Confirmations
    function getConfirmationsCount(uint256 _id) public view returns (uint256) {
        uint256 count;
        for (uint256 i = 0; i < owners.length; i++) {
            if (confirmations[_id][owners[i]]) {
                count++;
            }
        }
        return count;
    }

    function getConfirmations(uint256 _id)
        external
        view
        returns (address[] memory)
    {
        uint256 count = getConfirmationsCount(_id);
        address[] memory addresses = new address[](count);
        uint256 confirmed;
        for (uint256 i = 0; i < owners.length; i++) {
            if (confirmations[_id][owners[i]]) {
                addresses[confirmed] = owners[i];
                confirmed++;
            }
        }
        return addresses;
    }

    function isConfirmed(uint256 _id) public view returns (bool) {
        uint256 count = getConfirmationsCount(_id);
        return count >= required;
    }

    //Owners
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    modifier onlyOwners() {
        bool isOwner;
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == msg.sender) {
                isOwner = true;
            }
        }
        _;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}
