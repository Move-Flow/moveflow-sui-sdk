import { ObjectId } from '@mysten/sui.js'

export enum Network {
  devnet,
  testnet,
  mainnet,
}

export type Config = {
  network: Network
  fullNodeUrl: string
  packageObjectId: ObjectId
  globalConfigObjectId: ObjectId
  coinConfigsObjectId: ObjectId
  incomingStreamObjectId: ObjectId
  outgoingStreamObjectId: ObjectId
  manageCap: ObjectId
}

export const TESTNET_CONFIG: Config = {
  network: Network.testnet,
  fullNodeUrl: 'https://fullnode.testnet.sui.io/',
  packageObjectId: '0x675a02bc73c9e4d49deb51ea7b2e641fabbc8073e1bc15a8516ef189a9704a9f',
  globalConfigObjectId: '0x84ae09a02fb8f25eb8adb5197aaaa24a65b6d0bfd1e4181b969a19087bc375d4',
  coinConfigsObjectId: '0xe669867b35b4f259e8c16a0b34735e28e2b68a734059352f79396ccf1c5babeb',
  incomingStreamObjectId: '0x369df6d622bba0ca39c0ac35e75b6fcdff74d4bb1ef4896deee6ed1ceb8d4e30',
  outgoingStreamObjectId: '0x9cae1f58859b68f1b365ef7737f287d7e9a5f9a92ffc82e0251ffac93f26813e',
  manageCap: '0x560ddd917ff702aed09eb6bc30b5cdcba8a63b6ed6e91423c9c18f953d10d81b',
}

export function getConfig(network: Network): Config {
  switch (network) {
    case Network.testnet:
      return TESTNET_CONFIG
    default:
      throw new Error(`Sorry, ${Network[network]} not supported yet`)
  }
}
