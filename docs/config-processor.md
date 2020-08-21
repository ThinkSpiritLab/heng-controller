# 配置文件读取器

目前提供两种通过装饰器加载配置文件的方式

## 装饰器`@ReadProfileRelative`

相对路径配置加载器(不支持绝对路径加载)

- 位置: `src/config-processor/read-profile`  
- 细节: `@ReadProfileRelative(relativePath:string)`
  - 参数:`relativePath:string` : 相对于`config`的路径

## 装饰器`@ReadProfile`

路径配置加载器

- 位置: `src/config-processor/read-profile`  
- 细节: `@ReadProfileRelative(path:string)`
  - 参数:`path:string` : 相对于`src/config-processor`的路径或绝对路径。

## 使用方式

在config目录下，添加配置文件`application.toml`，内容为：

```toml
hello="hello,world"
[test]
num=123
    [test.r]
    somthing="sth"
```

添加对应文件`src/application.profile.ts`:

```typescript
import { Profile } from "./config-processor/profile";
import ReadProfileRelative from "./config-processor/read-profile";

@ReadProfileRelative("./application.toml")
export default class ApplicationProfile extends Profile{
    public hello?:string;
    public test?:{
        num:number
        r:{
            somthing:string
        }
    };
}
```

这里的ApplicationProfile申明可以任意编写，里面的变量定义仅仅便于代码提示。

## 配置文件访问

### 1.通过对象访问

在程序的任意位置，实例化此对象  
`const profile = new ApplicationProfile();`  
通过`profile.hello`即可访问`hello`配置。  
此方式的优点是：有代码提示，更加严谨。

### 2.通过原型链访问

在程序的任意位置,访问
`ApplicationProfile.prototype.hello`即可获取对应配置。  
此方式的优点是：方便。
