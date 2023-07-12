import { Address, toNano } from 'ton-core';
import { NftMinter } from '../wrappers/NftMinter';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
  const sender_address = provider.sender().address as Address;
  const nftMinter = provider.open(
    NftMinter.createFromConfig(
      {
        ownerAddress: sender_address,
        nextItemIndex: 0,
        collectionContentUrl: 'https://nft.ton.diamonds/diamonds.json',
        commonContentUrl: 'https://crypto-pepe-dev.github.io/pepe/nfts/metadata/',
        nftItemCode: await compile('NftItem'),
        royaltyParams: {
          factor: 15,
          base: 100,
          address: sender_address,
        },
      },
      await compile('NftMinter')
    )
  );

  await nftMinter.sendDeploy(provider.sender(), toNano('0.05'));

  await provider.waitForDeploy(nftMinter.address);

  // run methods on `nftMinter`
  const data = await nftMinter.getCollectionData();
  console.log(data);
}
