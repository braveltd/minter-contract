import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';
import { decodeOffChainContent, encodeOffChainContent } from './metadata';

export const Opcodes = {
  getRoyaltyParams: 0x693d3950,
  deploy: 1,
  batchDeploy: 2,
  changeOwner: 3,
  changeContent: 4,
};

export type RoyaltyParams = {
  factor: number;
  base: number;
  address: Address;
};

export type NftMinterConfig = {
  ownerAddress: Address;
  nextItemIndex: number;
  collectionContentUrl: string;
  commonContentUrl: string;
  nftItemCode: Cell;
  royaltyParams: RoyaltyParams;
};

export function nftMinterConfigToCell(config: NftMinterConfig): Cell {
  const content = beginCell()
    .storeRef(encodeOffChainContent(config.collectionContentUrl))
    .storeRef(beginCell().storeBuffer(Buffer.from(config.commonContentUrl)).endCell())
    .endCell();
  const royaltyParams = beginCell()
    .storeUint(config.royaltyParams.factor, 16)
    .storeUint(config.royaltyParams.base, 16)
    .storeAddress(config.royaltyParams.address)
    .endCell();

  return beginCell()
    .storeAddress(config.ownerAddress)
    .storeUint(config.nextItemIndex, 64)
    .storeRef(content)
    .storeRef(config.nftItemCode)
    .storeRef(royaltyParams)
    .endCell();
}

export class NftMinter implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

  static createFromAddress(address: Address) {
    return new NftMinter(address);
  }

  static createFromConfig(config: NftMinterConfig, code: Cell, workchain = 0) {
    const data = nftMinterConfigToCell(config);
    const init = { code, data };
    return new NftMinter(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async getCollectionData(provider: ContractProvider) {
    const result = await provider.get('get_collection_data', []);
    return {
      nextItemIndex: result.stack.readNumber(),
      collectionContentUrl: decodeOffChainContent(result.stack.readCell()),
      ownerAddress: result.stack.readAddress(),
    };
  }

  async getNftContent(provider: ContractProvider, index: bigint, individualNftContent: Cell): Promise<string> {
    const result = await provider.get('get_nft_content', [
      {
        type: 'int',
        value: index,
      },
      {
        type: 'cell',
        cell: individualNftContent,
      },
    ]);

    return decodeOffChainContent(result.stack.readCell());
  }

  async getRoyaltyParams(provider: ContractProvider): Promise<RoyaltyParams> {
    const result = await provider.get('royalty_params', []);

    return {
      factor: result.stack.readNumber(),
      base: result.stack.readNumber(),
      address: result.stack.readAddress(),
    };
  }
}
