# 外部通信模块说明
外部通信模块负责oj和web端通信，只用于和web端收发任务，回报任务状态



JudgeLogin Exit getLog reportStatus createjudge这几个函数都和内部通信重复了。外部通信只负责和oj的web端通信，只用于和web端收发任务，回报任务状态；不负责管理/操纵评测机，不负责和评测机通信。
另外各模块的管理员接口是分开提供的吗
@Nugine
另外收到任务之后，taskid要自动生成吗，还是用web端提供的taskid。 @A0nameless0man @Nugine


## 使用的redis键值对
externalmodule:calbckurl : taskid - url

externalmodule:taskseq : taskid - JSON.stringify(Internal.CreateJudgeRequest)
## 外部模块提供的服务
### 提供创建评测任务的接口

1. 从用户端接收评测任务
将external.CreateJudgeRequest从外部通信协议格式转换为内部通信协议格式。并将其转化为JSON字符串，放入redis队列中。塞入评测队列。等待评测结果回调

2. 等待回调
调用控制端提供的回调接口，接受taskid和JudgeResponse。

### 任务统计接口

