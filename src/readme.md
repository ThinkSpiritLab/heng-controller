## 客户端调用
``` ts
//use socketIO
import { AppGateway } from 'src/app.gateway';

//构造函数
constructor(
    private readonly gateway: AppGateway,
){}

await this.gateway.emit('connectionmethod',JSON.stringfy(内容))
```

connectionmethod中填RPC定义（见协议），后面接参数