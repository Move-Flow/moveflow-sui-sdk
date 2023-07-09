# Move-Flow SUI SDK

# Introduction

**Move-Flow** is an crypto asset streaming protocol built in Move language on both [Aptos](https://aptosfoundation.org/) and [Sui](https://sui.io/) blockchains.

Move-Flow is able to transfer assets on chain according to predefined rules. With one transaction, funds will flow from your wallet to the recipient real-time(by second), to conduct timely financial transactions without intermediaries..

This is the Typescript SDK for the protocol

You can find [docs here](https://move-flow.github.io/moveflow-sui-sdk/)

# Installation

    yarn add "@moveflow/sui-sdk.js"

# Usage Example

### Init SDK

```typescript
import { Stream, Network } from "@moveflow/sui-sdk.js";

const stream = new Stream(Network.testnet);
```

### Create a new payment stream

```typescript
const coinType = "0x2::sui::SUI";
const name = "first";
const remark = "first sui stream";
const depositAmount = BigInt(10000000);
const startTime = Math.floor(Date.now() / 1000);
const duration = 24 * 60 * 60; // 1 day
const stopTime = startTime + duration;
const interval = 1; // 1 second
const senderAddress = "0x7905ae3ed4a5a77284684fa86fd83c38a9f138b0cc390721c46bca3aaafaf26c";
const recipientAddress = "0x45f5a96940e84dd876b1adc2c434961178fc94cb79c23a9f8ddc57c996255869";
const tx = await stream.createTransaction(
  coinType,
  name,
  remark,
  senderAddress,
  recipientAddress,
  depositAmount,
  startTime,
  stopTime,
  interval
);
const response = await wallet.signAndExecuteTransactionBlock({
  transactionBlock: tx,
  options: {
    showObjectChanges: true,
  },
});
const streamCreationResult = stream.getStreamCreationResult(response);
```

### Withdraw payment from a stream

```typescript
const tx = stream.withdrawTransaction(coinType, streamCreationResult.streamId);
const response = await wallet.signAndExecuteTransactionBlock({
  transactionBlock: tx,
});
```

### Close a stream

```typescript
const tx = stream.closeTransaction(
  coinType,
  streamCreationResult.senderCap,
  streamCreationResult.streamId
);
const response = await wallet.signAndExecuteTransactionBlock({
  transactionBlock: tx,
});
```

### Pause a stream

```typescript
const tx = stream.pauseTransaction(
  coinType,
  streamCreationResult.senderCap,
  streamCreationResult.streamId
);

const response = await wallet.signAndExecuteTransactionBlock({
  transactionBlock: tx,
});
```

### Resume a stream

```typescript
const tx = stream.resumeTransaction(
  coinType,
  streamCreationResult.senderCap,
  streamCreationResult.streamId
);
const response = await wallet.signAndExecuteTransactionBlock({
  transactionBlock: tx,
});
```

### Query stream by streamId

```typescript
const id = "0x1f612145242fde5b22ddf68838dce2d8cd5629a021caa2e4093a370548ab17a4";
const streams = await stream.getStreamById(id);
console.log("streams:", streams);
```

### Query stream's withdrawable amount

```typescript
const id = "0x1f612145242fde5b22ddf68838dce2d8cd5629a021caa2e4093a370548ab17a4";
const _stream = await stream.getStreamById(id);
const streams = await stream.withdrawable(_stream);
console.log("streams:", streams);
```

### Query incoming streams

```typescript
const address =
  "0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2";
const streams = await stream.getStreams(address, StreamDirection.IN);
console.log("streams:", streams);
```

### Query outgoing streams

```typescript
const address = "0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2";
const streams = await stream.getStreams(address, StreamDirection.OUT);
console.log("streams:", streams);
```

### Query sender caps

```typescript
const owner = "0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2";
const caps = await stream.getSenderCap(owner);
const list = caps.data.map((m) => {
  return {
    cap: (m.data?.content as any).fields.id.id,
    stream: (m.data?.content as any).fields.stream,
  };
});

console.log("list:", list);
```

### Query supported coins

```typescript
const coins = await stream.getSupportedCoins();
console.log("coins:", coins);
```
