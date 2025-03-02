// src/utils/blockchain.js
const Web3 = require('web3');
const env = require('../config/env');

class BlockchainService {
  constructor() {
    // Initialize Web3 connection based on network configuration
    this.initializeProvider();
    
    // Contract ABIs
    this.propertyTokenABI = require('../contracts/PropertyToken.json');
    this.registryABI = require('../contracts/PropertyRegistry.json');
    
    // Contract addresses
    this.registryAddress = env.REGISTRY_CONTRACT_ADDRESS;
  }

  initializeProvider() {
    let provider;
    
    switch(env.BLOCKCHAIN_NETWORK) {
      case 'local':
        provider = 'http://localhost:8545';
        break;
      case 'testnet':
        provider = `https://sepolia.infura.io/v3/${env.INFURA_API_KEY}`;
        break;
      case 'mainnet':
        provider = `https://mainnet.infura.io/v3/${env.INFURA_API_KEY}`;
        break;
      default:
        provider = 'http://localhost:8545';
    }
    
    this.web3 = new Web3(provider);
  }

  // Create new wallet
  async createWallet() {
    try {
      const account = this.web3.eth.accounts.create();
      return {
        address: account.address,
        privateKey: account.privateKey
      };
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error('Failed to create blockchain wallet');
    }
  }

  // Get token balance for address
  async getTokenBalance(tokenAddress, walletAddress) {
    try {
      const tokenContract = new this.web3.eth.Contract(
        this.propertyTokenABI,
        tokenAddress
      );
      
      const balance = await tokenContract.methods.balanceOf(walletAddress).call();
      return this.web3.utils.fromWei(balance);
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw new Error('Failed to retrieve token balance');
    }
  }

  // Create property token contract
  async createPropertyToken(propertyId, totalSupply, propertyName, propertySymbol) {
    try {
      // Get registry contract
      const registry = new this.web3.eth.Contract(
        this.registryABI,
        this.registryAddress
      );
      
      // Create token through registry
      // Note: In a real implementation, this would use the platform wallet to sign
      const transaction = registry.methods.createPropertyToken(
        propertyId,
        this.web3.utils.toWei(totalSupply.toString()),
        propertyName,
        propertySymbol
      );
      
      // This is a placeholder - actual implementation would sign and send the transaction
      // const gas = await transaction.estimateGas({ from: platformWallet });
      // const signedTx = await web3.eth.accounts.signTransaction({...}, privateKey);
      // const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      
      // Simulate response
      return {
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        tokenAddress: '0x' + Math.random().toString(16).substr(2, 40)
      };
    } catch (error) {
      console.error('Error creating property token:', error);
      throw new Error('Failed to create property token');
    }
  }

  // Transfer tokens
  async transferTokens(tokenAddress, fromAddress, toAddress, amount, privateKey) {
    try {
      const tokenContract = new this.web3.eth.Contract(
        this.propertyTokenABI,
        tokenAddress
      );
      
      const amountWei = this.web3.utils.toWei(amount.toString());
      const transaction = tokenContract.methods.transfer(toAddress, amountWei);
      
      // This is a placeholder - actual implementation would sign and send the transaction
      // const gas = await transaction.estimateGas({ from: fromAddress });
      // const signedTx = await web3.eth.accounts.signTransaction({...}, privateKey);
      // const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      
      // Simulate response
      return {
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        status: true
      };
    } catch (error) {
      console.error('Error transferring tokens:', error);
      throw new Error('Failed to transfer tokens');
    }
  }

  // Get transaction status
  async getTransactionStatus(txHash) {
    try {
      const receipt = await this.web3.eth.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return { status: 'pending' };
      }
      
      return {
        status: receipt.status ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed
      };
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw new Error('Failed to get transaction status');
    }
  }

  // Verify blockchain transaction
  async verifyTransaction(txHash) {
    try {
      const tx = await this.web3.eth.getTransaction(txHash);
      const receipt = await this.web3.eth.getTransactionReceipt(txHash);
      
      if (!tx || !receipt) {
        return { valid: false, reason: 'Transaction not found' };
      }
      
      return {
        valid: Boolean(receipt.status),
        from: tx.from,
        to: tx.to,
        value: this.web3.utils.fromWei(tx.value),
        blockNumber: receipt.blockNumber,
        confirmations: tx.blockNumber ? 
          await this.web3.eth.getBlockNumber() - tx.blockNumber : 
          0
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      throw new Error('Failed to verify transaction');
    }
  }
}

// Export singleton instance
module.exports = new BlockchainService();