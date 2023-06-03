# moveflow-sui-sdk

## Getting Started

Create a project using this example:

```bash
yarn add @moveflow/sui-sdk.js
```

You can start editing the page by modifying `src/App.tsx`. The page auto-updates as you edit the file.


### use sdk


```
import {Stream, StreamDirection, StreamCreationResult } from "@moveflow/sui-sdk.js"
import { Network } from "@moveflow/sui-sdk.js/dist/tsc/config";

const stream = new Stream(Network.testnet)

```

### submit tx

1.  create a stream

```
  const name = 'first'
  const remark = 'first sui stream'
  const recipient = '0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2'
  const depositAmount = 10000000
  const startTime = Date.parse(new Date() as any)/1000  - 60
  const duration = 24 * 60 * 60 // 1 day
  const stopTime = startTime + duration

  const tx = stream.createTransaction(
    coinType,                                     // stream pyament coin typ， eq, 0x:sui:SIU 
    name,                                         // stream name text
    remark,                                       // remark text
    recipient,                                    // recipient address
    depositAmount,                                // deposit amount
    startTime,                                    // stop time, unit: second 
    stopTime,                                     // stop time, unit: second
    // interval: 1,                               // stream interval: default 1s 
  )
  const response = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any,
  });
  streamCreationResult = stream.getStreamCreationResult(response)

```

2. withdraw from a stream 

```
const tx = stream.withdrawTransaction(
    coinType, 
    streamCreationResult.streamId 
)
const response = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any,
});

```

3.  close a stream

```
  const tx = stream.closeTransaction(
    coinType,
    streamCreationResult.senderCap,
    streamCreationResult.streamId
  )
  const response = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any,
  });
```

4. Pause a stream

```
const tx = stream.pauseTransaction(
  coinType,
  streamCreationResult.senderCap,
  streamCreationResult.streamId
)

const response = await wallet.signAndExecuteTransactionBlock({
    transactionBlock: tx as any,
});

```

5. Resume a stream

```
const tx = stream.resumeTransaction(
  coinType,
  streamCreationResult.senderCap,
  streamCreationResult.streamId
)
const response = await wallet.signAndExecuteTransactionBlock({
  transactionBlock: tx as any,
});

```
 
### query streams 

1.  query stream by streamId

```
const id = '0x1f612145242fde5b22ddf68838dce2d8cd5629a021caa2e4093a370548ab17a4'
const streams = await stream.getStreamById(id)
console.log("streams:", streams)
```

2. query stream's withdrawable amount

```
const id = '0x1f612145242fde5b22ddf68838dce2d8cd5629a021caa2e4093a370548ab17a4'
const _stream = await stream.getStreamById(id)
const streams = await stream.withdrawable(_stream)
console.log("streams:", streams)

```

3. query incoming streams

```
const address = '0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2'
const streams = await stream.getStreams(address, StreamDirection.IN)
console.log("streams:", streams)
```

4. query outgoing streams

```
const address = '0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2'
const streams = await stream.getStreams(address, StreamDirection.OUT)
console.log("streams:", streams)

```

5. query outgoing streams

```
const owner = '0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2'
const caps = await stream.getSenderCap(owner)
const list = caps.data.map(m=> { 
    return {
    cap: (m.data?.content as any).fields.id.id, 
    stream: (m.data?.content as any).fields.stream
    }
})

```


6. query sender caps 

```
const owner = '0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2'
const caps = await stream.getSenderCap(owner)
const list = caps.data.map(m=> { 
  return {
    cap: (m.data?.content as any).fields.id.id, 
    stream: (m.data?.content as any).fields.stream
  }
})

console.log("list:", list)
```





## ref: contract version 0.3.1

```
packageObjectId: '0x8adcbe225d672f56ee96abc51481887e106661ef899ccc5a7dec7161b790be69',
globalConfigObjectId: '0x95b3e1f1fefef450e4fdbf6d5279ca2421429a5bd2ce7da50cf32b62c5f326b2',
coinConfigsObjectId: '0x64d9d712a435f282cbd5756b7b3d215a5ef81f385ac3339a6b3d23119e4c3a52',
incomingStreamObjectId: '0x2fb090feef48968b937ff470273dcab417d4ad870d7e336fcd7b656fdeeb936a',
outgoingStreamObjectId: '0x204f815be7a8eaf535e4899556a14d07dd2e29a35148ac249577858ba9583b8a',

```

## Learn More

To learn more about thirdweb, React and CRA, take a look at the following resources:

- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started) - learn about CRA features.
- [React documentation](https://reactjs.org/) - learn React.

You can check out [the thirdweb GitHub organization](https://github.com/thirdweb-dev) - your feedback and contributions are welcome!

## Join our Discord!

For any questions, suggestions, join our discord at [https://discord.gg/thirdweb](https://discord.gg/thirdweb).
