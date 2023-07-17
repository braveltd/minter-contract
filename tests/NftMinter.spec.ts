import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { beginCell, Cell, contractAddress, toNano } from 'ton-core';
import { NftMinter } from '../wrappers/NftMinter';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { decodeOffChainContent } from '../wrappers/metadata';
import { NftItem } from '../wrappers/NftItem';

describe('NftMinter', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('NftMinter');
  });

  let blockchain: Blockchain;
  let nftMinter: SandboxContract<NftMinter>;
  const commonContentUrl = 'https://crypto-pepe-dev.github.io/pepe/nfts/metadata/';
  const collectionContentUrl = 'https://nft.ton.diamonds/diamonds.json';

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    const deployer = await blockchain.treasury('deployer');

    nftMinter = blockchain.openContract(
      NftMinter.createFromConfig(
        {
          ownerAddress: deployer.address,
          nextItemIndex: 0,
          collectionContentUrl: collectionContentUrl,
          commonContentUrl: commonContentUrl,
          nftItemCode: await compile('NftItem'),
          royaltyParams: {
            factor: 10,
            base: 100,
            address: deployer.address,
          },
        },
        code
      )
    );

    const deployResult = await nftMinter.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: nftMinter.address,
      deploy: true,
      success: true,
    });
  });

  it('should deploy', async () => {
    // the check is done inside beforeEach
    // blockchain and nftMinter are ready to use
  });

  it('should get collection data', async () => {
    const deployer = await blockchain.treasury('deployer');
    const data = await nftMinter.getCollectionData();

    expect(data.nextItemIndex).toBe(0);
    expect(data.collectionContentUrl).toBe(collectionContentUrl);
    expect(data.ownerAddress).toEqualAddress(deployer.address);
  });

  it('should get nft address by index', async () => {
    const index = 0n;
    const address = await nftMinter.getNftAddressByIndex(index);

    const data = beginCell().storeUint(index, 64).storeAddress(nftMinter.address).endCell();
    const code = await compile('NftItem');

    expect(address).toEqualAddress(contractAddress(0, { code, data }));
  });

  it('should get rolayty params', async () => {
    const params = await nftMinter.getRoyaltyParams();
    const deployer = await blockchain.treasury('deployer');

    expect(params.factor).toBe(10);
    expect(params.base).toBe(100);
    expect(params.address).toEqualAddress(deployer.address);
  });

  it('should get nft content', async () => {
    const someContent = 'Penis.json';
    const nftContent = await nftMinter.getNftContent(0n, beginCell().storeBuffer(Buffer.from(someContent)).endCell());

    expect(nftContent).toBe(commonContentUrl + someContent);
  });

  it('should mint nft', async () => {
    const sender = await blockchain.treasury('sender');

    const mintResult = await nftMinter.sendMint(sender.getSender(), {
      value: toNano('0.05'),
      queryId: Date.now(),
      coinsForStorage: toNano('0.05'),
    });

    expect(mintResult.transactions).toHaveTransaction({
      from: sender.address,
      to: nftMinter.address,
      success: true,
    });
  });

  it('should batch mint nft', async () => {
    const sender = await blockchain.treasury('sender');

    const mintResult = await nftMinter.sendBatchMint(sender.getSender(), {
      value: toNano('3'),
      queryId: Date.now(),
    });

    expect(mintResult.transactions).toHaveTransaction({
      from: sender.address,
      to: nftMinter.address,
      success: true,
    });
  });

  it('should not batch mint more than 250 nft', async () => {
    const sender = await blockchain.treasury('sender');

    const mintResult = await nftMinter.sendBatchMint(sender.getSender(), {
      value: toNano('25'), // 25 = 250 items
      queryId: Date.now(),
    });

    expect(mintResult.transactions).toHaveTransaction({
      from: sender.address,
      to: nftMinter.address,
      success: false,
      exitCode: 399,
    });
  });
});
