export function Schema() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">埋点管理</h2>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Schema 配置</h3>
        <p className="text-gray-600 mb-4">
          在项目根目录创建 <code className="bg-gray-100 px-2 py-1 rounded">track-schema.yaml</code> 文件来定义埋点规范。
        </p>

        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`version: "1.0"

events:
  - name: button_click
    description: 按钮点击事件
    type: click
    module: 首页
    owner: 张三
    properties:
      - name: button_id
        type: string
        required: true
        description: 按钮唯一标识
      - name: button_text
        type: string
        required: false
        description: 按钮文案

  - name: product_expose
    description: 商品曝光
    type: expose
    module: 商品列表
    properties:
      - name: product_id
        type: string
        required: true
      - name: position
        type: number
        description: 曝光位置索引`}</pre>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">生成文档</h3>
        <p className="text-gray-600 mb-4">
          运行以下命令生成埋点文档：
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
          <code>npx @buried-point/cli docs</code>
        </div>
      </div>
    </div>
  );
}
