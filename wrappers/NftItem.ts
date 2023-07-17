import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';
import { decodeOffChainContent, encodeOffChainContent } from './metadata';

export type NftItemConfig = {
  index: number;
  collectionAddress: Address;
  ownerAddress: Address;
  content: string;
};

export function nftItemConfigToCell(config: NftItemConfig): Cell {
  return beginCell()
    .storeUint(config.index, 64)
    .storeAddress(config.collectionAddress)
    .storeAddress(config.ownerAddress)
    .storeRef(encodeOffChainContent(config.content))
    .endCell();
}

export class NftItem implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

  static createFromAddress(address: Address) {
    return new NftItem(address);
  }

  static createFromConfig(config: NftItemConfig, code: Cell, workchain = 0) {
    const data = nftItemConfigToCell(config);
    const init = { code, data };
    return new NftItem(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async getNftData(provider: ContractProvider) {
    const result = await provider.get('get_nft_data', []);

    return {
      init: result.stack.readBoolean(),
      index: result.stack.readNumber(),
      collectionAddress: result.stack.readAddress(),
      ownerAddress: result.stack.readAddress(),
      content: decodeOffChainContent(result.stack.readCell()),
    };
  }
}
