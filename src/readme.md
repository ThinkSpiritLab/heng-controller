## �ͻ��˵���
``` ts
//use socketIO
import { AppGateway } from 'src/app.gateway';

//���캯��
constructor(
    private readonly gateway: AppGateway,
){}

await this.gateway.emit('connectionmethod',JSON.stringfy(����))
```

connectionmethod����RPC���壨��Э�飩������Ӳ���