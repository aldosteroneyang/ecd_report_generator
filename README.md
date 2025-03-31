# ECD 腦灌注報告生成器

## 專案概述

這是一個基於網頁的腦灌注 (ECD) 報告生成器，用於自動化生成放射學報告。該工具允許使用者透過互動式界面輸入大腦不同區域的灌注情況，並自動生成標準化的放射學發現 (Findings) 與印象 (Impression) 報告。

## 檔案結構

- `index.html` - 主要HTML檔案，包含UI元素和初始化JavaScript
- `report-generator.js` - 核心報告生成邏輯
- `README.md` - 本文件

## 技術架構

- 純前端應用，無需後端伺服器
- 使用 Handsontable 進行數據表格管理
- 未使用框架，採用原生JavaScript

## 核心數據結構

### 主要全局變數

1. `locationStatusMap`：Map物件，儲存所有腦區位置及其對應的嚴重程度
   - 格式：Map<string, string>，鍵為位置（如"left frontal"），值為嚴重程度（如"moderate"）

2. `appConstants`：包含應用常數的物件，在初始化時注入到全局範圍
   ```javascript
   window.appConstants = {
     BILATERAL_ONLY_AREAS,  // 只能是雙側的區域陣列
     LOCATIONS,             // 所有可能位置的陣列
     SIDES,                 // 可能的方向（"left", "right", "bilateral"）
     hot                    // Handsontable實例
   };
   ```

3. `atrophyFindings`：儲存腦萎縮發現的物件
   ```javascript
   window.atrophyFindings = {
     fissures: false,
     ventricles: false,
     sulci: false,
     interhemisphericFissures: false
   };
   ```

4. `cerebellarDiaschisis`：布林值，表示是否有小腦交叉失活

### 常數

```javascript
const BILATERAL_ONLY_AREAS = ['brain stem'];

const AREAS = [
  'frontal', 'parietal', 'temporal', 'occipital',
  // 更多區域...
];

const SEVERITIES = ['', 'moderate', 'slight', 'mild', 'marked'];
const SIDES = ['left', 'right', 'bilateral'];
```

## 核心功能流程

### 初始化流程

1. `DOMContentLoaded`事件觸發以下初始化函數：
   - `initLocationMap()` - 初始化位置狀態映射
   - `initHandsontable()` - 設置數據表格
   - `initAtrophyCheckboxes()` - 初始化萎縮相關複選框
   - 導出全局變數供報告生成器使用
   - 使用`requestAnimationFrame`確保DOM更新後立即調用`updateReportAreas()`

### 報告生成流程 (report-generator.js)

1. `updateReportAreas()` - 更新報告區域的內容
   - 檢查DOM元素是否存在，不存在則重新獲取
   - 調用`generateReports()`獲取報告文本
   - 根據ALZ和DLB複選框狀態選擇適當的impression文本

2. `generateReports()` - 生成報告文本
   - 收集表格中的數據
   - 生成基本的Findings和Impression文本
   - 如果有萎縮發現，添加萎縮相關文本
   - 處理小腦交叉失活

3. `formatText()` - 格式化文本，確保大小寫和標點符號正確

### 數據收集流程

1. `collectDataFromRows()` - 從表格收集數據
   - 返回格式：`[{area, side, severity}, ...]`
   
2. `syncTableWithMap()` - 同步locationStatusMap到表格
   - 確保表格數據與Map一致
   - 觸發`locationStatusMapChanged`事件

### 數據發送流程

1. `sendReportData()` - 發送報告數據到opener窗口
   - 收集Findings和Impression文本
   - 使用postMessage發送到opener窗口

## 事件系統

系統使用自定義事件進行內部通信：

1. `locationStatusMapChanged` - 當位置狀態映射變更時觸發
   - 用於通知報告生成器更新報告內容
   - 用於更新小腦交叉失活複選框狀態

## 擴展指南

### 添加新的腦區位置

1. 更新`AREAS`陣列添加新的區域名稱
2. 如果是雙側區域，添加到`BILATERAL_ONLY_AREAS`
3. 無需額外修改，系統會自動生成LOCATIONS陣列

### 修改報告生成邏輯

1. 在`report-generator.js`中查找並修改以下函數：
   - `generateReports()` - 主要報告生成邏輯
   - `formatRegions()` - 區域格式化邏輯
   - `createHypoperfusionText()` - 生成低灌注文本

### 添加新的複選框特徵

1. 在`initAtrophyCheckboxes()`函數中添加新選項
2. 在`window.atrophyFindings`物件中添加對應的屬性
3. 在`generateReports()`中處理新添加的特徵

## 重點算法解釋

### 報告文本格式化

系統使用多層級替換和處理確保報告文本格式正確：

1. `formatText()` - 處理基本文本格式
2. `pluralizeRegions()` - 處理區域複數形式
3. `processReportText()` - 最終文本處理

### ALZ和DLB特殊文本處理

當ALZ和DLB複選框同時選中時，系統會：

1. 拆分impression文本分為多個項目
2. 單獨處理萎縮相關描述，確保放在正確位置
3. 合併ALZ和DLB相關文本到基本發現中

## 常見維護任務

### 修改文本描述

- 大多數文本描述直接寫在`report-generator.js`中
- 找到對應的文本字符串直接修改

### 修改UI樣式

- UI樣式在`index.html`的`<style>`標籤中定義
- 按功能區分：表格樣式、按鈕樣式、通知樣式等

### 進行測試

1. 添加表格數據觀察生成的報告
2. 特別檢查複雜場景：
   - 同時勾選ALZ和DLB
   - 有/無萎縮發現
   - 各種區域組合的低灌注描述

## 調試技巧

- 系統在關鍵點添加了console.log記錄
- 使用瀏覽器開發工具監視locationStatusMap和事件流
- 使用CustomEvent檢查數據流動 