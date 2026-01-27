# 万年历查询

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api.tiax.cn/almanac/:
    get:
      summary: 万年历查询
      deprecated: false
      description: 中国万年历信息查询，直接请求不带参数则返回当日信息，http、https均可
      tags:
        - 查询类API
        - 万年历
      parameters:
        - name: year
          in: query
          description: ''
          required: true
          example: '2023'
          schema:
            type: string
        - name: month
          in: query
          description: ''
          required: true
          example: '3'
          schema:
            type: string
        - name: day
          in: query
          description: ''
          required: true
          example: '2'
          schema:
            type: string
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  公历日期:
                    type: string
                  农历日期:
                    type: string
                  黄历日期:
                    type: string
                  回历日期:
                    type: string
                  干支日期:
                    type: string
                  五行纳音:
                    type: string
                  值日星神:
                    type: string
                  宜:
                    type: string
                  忌:
                    type: string
                x-apifox-orders:
                  - 公历日期
                  - 农历日期
                  - 黄历日期
                  - 回历日期
                  - 干支日期
                  - 五行纳音
                  - 值日星神
                  - 宜
                  - 忌
                required:
                  - 公历日期
                  - 农历日期
                  - 黄历日期
                  - 回历日期
                  - 干支日期
                  - 五行纳音
                  - 值日星神
                  - 宜
                  - 忌
              example:
                公历日期: 2023年3月6日 星期一
                农历日期: 农历二零二三年 二月(大) 十五
                黄历日期: 阳历2023年3月6日，癸卯年阴历二月十五日
                回历日期: 伊斯兰历1444年8月13日
                干支日期: 癸卯年 乙卯月 癸亥日
                五行纳音: 大海水
                值日星神: 玄武(凶星)
                宜: >-
                  祭拜 祭祀、开光、塑绘、订婚 订盟、纳采、合帐、成人礼 冠笄、拆卸、动土、起基、上梁、搬迁新宅 乔迁新居 入宅、安香、开业
                  开幕 开市、立券、买车 提车 纳财、沐浴、生子 求子 求嗣、出火、竖柱、安门、
                忌: 造庙 结婚 嫁娶 伐木 安葬
          headers: {}
          x-apifox-name: 成功
        '404':
          description: ''
          content:
            application/xml:
              schema:
                type: object
                properties:
                  msg:
                    type: string
                    title: 日期不存在,请检查：入参日期格式为：YYYYMMD
                x-apifox-orders:
                  - msg
                required:
                  - msg
              example: 日期不存在,请检查：入参日期格式为：YYYYMMD
          headers: {}
          x-apifox-name: 日期不存在
      security: []
      x-apifox-folder: 查询类API
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/2394526/apis/api-66312315-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: ''
    description: 正式环境
security: []

```
