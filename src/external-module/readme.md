# 外部通信模块说明

外部通信模块负责 oj 和 web 端通信，只用于和 web 端收发任务，回报任务状态

## 使用的 redis 键值对

'externalmodule:calbckurl:upd' : taskid - url

'externalmodule:calbckurl:fin' : taskid - url

'externalmodule:taskseq' : taskid - JSON.stringify(Internal.CreateJudgeRequest)

## 外部模块提供的服务

### 提供创建评测任务的接口

1. 从用户端接收评测任务
   将 external.CreateJudgeRequest 从外部通信协议格式转换为内部通信协议格式。并将其转化为 JSON 字符串，放入 redis 队列中。塞入评测队列。等待评测结果回调

2. 等待回调
   调用控制端提供的回调接口，接受 taskid，接受 taskid。
