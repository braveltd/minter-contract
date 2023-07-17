import { Address, toNano } from 'ton-core';
import { NftMinter } from '../wrappers/NftMinter';
import { NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Collection address'));

  const nftMinter = provider.open(NftMinter.createFromAddress(address));

  await nftMinter.sendMint(provider.sender(), {
    value: toNano('0.05'),
    queryId: Date.now(),
    coinsForStorage: toNano('0.05'),
  });
}
