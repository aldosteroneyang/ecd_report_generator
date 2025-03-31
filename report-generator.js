// 生成報告相關的功能函數

// 從window.appConstants獲取全局變數
function getConstants() {
    return window.appConstants || {
        BILATERAL_ONLY_AREAS: [],
        LOCATIONS: [],
        SIDES: [],
        hot: null
    };
}

// 初始化DOM元素引用
let findingsTextarea, impressionTextarea, alzCheckbox, dlbCheckbox;

// 在頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    findingsTextarea = document.getElementById('findings-area');
    impressionTextarea = document.getElementById('impression-area');
    alzCheckbox = document.getElementById('alz-checkbox');
    dlbCheckbox = document.getElementById('dlb-checkbox');
    
    // 添加checkbox事件監聽，不再互斥
    alzCheckbox.addEventListener('change', function() {
        updateReportAreas();
    });
    
    dlbCheckbox.addEventListener('change', function() {
        updateReportAreas();
    });
    
    // 監聽位置狀態變更
    document.addEventListener('locationStatusMapChanged', updateReportAreas);
});

// 更新報告區域的內容
function updateReportAreas() {
    console.log("執行updateReportAreas");
    if (!findingsTextarea || !impressionTextarea) {
        console.log("找不到文本區域元素，重新獲取");
        findingsTextarea = document.getElementById('findings-area');
        impressionTextarea = document.getElementById('impression-area');
        
        if (!findingsTextarea || !impressionTextarea) {
            console.log("仍找不到文本區域元素，退出");
            return;
        }
    }
    
    if (!alzCheckbox || !dlbCheckbox) {
        console.log("找不到複選框元素，重新獲取");
        alzCheckbox = document.getElementById('alz-checkbox');
        dlbCheckbox = document.getElementById('dlb-checkbox');
    }
    
    const reports = generateReports();
    
    // 更新findings
    findingsTextarea.value = reports.findings;
    
    // 根據checkbox選擇適當的impression
    if (alzCheckbox && alzCheckbox.checked && dlbCheckbox && dlbCheckbox.checked) {
        // 兩者都選中的情況，合併ALZ和DLB的文本，並加上臨床相關建議
        
        // 獲取報告對象，包含已生成的報告文本
        const reportObj = generateReports();
        
        // 處理報告順序問題 - 將impression拆分成不同項目
        // 檢查是否有萎縮(atrophy)相關描述
        const hasAtrophy = reportObj.impression.includes("Suspect cerebral cortical atrophy");
        
        if (hasAtrophy) {
            // 拆分不同的項目
            const lines = reportObj.impression.split('\n');
            let items = [];
            let atrophyItem = null;
            
            // 找出萎縮項和其他項
            for (let line of lines) {
                if (line.trim() === '') continue;
                
                if (line.includes("Suspect cerebral cortical atrophy")) {
                    atrophyItem = line;
                } else {
                    items.push(line);
                }
            }
            
            // 處理非萎縮項，添加ALZ和DLB文本
            if (items.length > 0) {
                // 獲取第一項（通常是hypoperfusion描述）
                let firstItem = items[0];
                
                // 移除數字前綴（如果有）
                firstItem = firstItem.replace(/^\d+\.\s+/, '');
                
                // 獲取ALZ和DLB的信息文本
                const data = collectDataFromRows();
                const regAlz = ["posterior cingulate", "posterior parietal", "precuneus"];
                const regDlb = ["occipital"];
                
                const posAlz = regAlz.filter(x => data.some(d => d.area === x));
                const posDlb = regDlb.filter(x => data.some(d => d.area === x));
                
                let txtAlz = createHypoperfusionText(posAlz, "has been reported to be commonly observed in patients with Alzheimer's disease.");
                let txtDlb = createHypoperfusionText(posDlb, "is considered a supportive biomarker of dementia with Lewy bodies.");
                
                txtAlz = txtAlz || "There is no apparently decreased perfusion in the parietal association areas, posterior cingulate, precuneus, which are the regions commonly affected in Alzheimer's disease.";
                txtDlb = txtDlb || "There is no definite evidence of occipital hypoperfusion, a supportive biomarker of dementia with Lewy bodies, observed in this patient.";
                
                // 清理第一項中可能已有的ALZ或DLB相關文本
                firstItem = firstItem.replace(/There is no apparently decreased perfusion.*?disease\./g, "");
                firstItem = firstItem.replace(/There is no definite evidence of occipital hypoperfusion.*?patient\./g, "");
                firstItem = firstItem.replace(/Hypoperfusion in.*?disease\./g, "");
                firstItem = firstItem.replace(/Hypoperfusion in.*?bodies\./g, "");
                firstItem = firstItem.replace(/However,.*?recommended\./g, "");
                firstItem = firstItem.replace(/Besides,.*?recommended\./g, "");
                firstItem = firstItem.replace(/Clinical correlation is recommended\./g, "");
                
                // 清理重複的空格和句點
                firstItem = firstItem.replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').trim();
                
                // 確保以句點結尾
                if (firstItem && !firstItem.endsWith('.')) {
                    firstItem += '.';
                }
                
                // 處理可能殘留的"slightly hypoperfusion"問題
                firstItem = firstItem.replace(/slightly hypoperfusion/g, 'suspicious hypoperfusion');
                
                // 添加ALZ和DLB的文本
                firstItem += ' ' + txtAlz + ' ' + txtDlb + ' Clinical correlation is recommended.';
                
                // 確保文本格式正確
                firstItem = formatText(firstItem);
                
                // 確保句子開頭的"suspicious"首字母大寫
                firstItem = firstItem.replace(/(^|[.!?]\s+)suspicious/gi, function(match, p1) {
                    return p1 + 'Suspicious';
                });
                
                // 生成最終的報告文本，保持正確順序
                let finalText = "1. " + firstItem;
                
                // 添加萎縮項（如果有）
                if (atrophyItem) {
                    // 除去數字前綴
                    atrophyItem = atrophyItem.replace(/^\d+\.\s+/, '');
                    finalText += "\n2. " + atrophyItem;
                }
                
                impressionTextarea.value = finalText;
                return;
            }
        }
        
        // 如果沒有萎縮項或拆分失敗，使用原有邏輯
        // 獲取ALZ和DLB的信息文本
        const data = collectDataFromRows();
        const regAlz = ["posterior cingulate", "posterior parietal", "precuneus"];
        const regDlb = ["occipital"];
        
        const posAlz = regAlz.filter(x => data.some(d => d.area === x));
        const posDlb = regDlb.filter(x => data.some(d => d.area === x));
        
        let txtAlz = createHypoperfusionText(posAlz, "has been reported to be commonly observed in patients with Alzheimer's disease.");
        let txtDlb = createHypoperfusionText(posDlb, "is considered a supportive biomarker of dementia with Lewy bodies.");
        
        txtAlz = txtAlz || "There is no apparently decreased perfusion in the parietal association areas, posterior cingulate, precuneus, which are the regions commonly affected in Alzheimer's disease.";
        txtDlb = txtDlb || "There is no definite evidence of occipital hypoperfusion, a supportive biomarker of dementia with Lewy bodies, observed in this patient.";
        
        // 處理基礎報告部分
        let impressionText = reportObj.impression;
        
        // 替換掉可能已有的ALZ或DLB相關文本
        impressionText = impressionText.replace(/There is no apparently decreased perfusion.*?disease\./g, "");
        impressionText = impressionText.replace(/There is no definite evidence of occipital hypoperfusion.*?patient\./g, "");
        impressionText = impressionText.replace(/Hypoperfusion in.*?disease\./g, "");
        impressionText = impressionText.replace(/Hypoperfusion in.*?bodies\./g, "");
        impressionText = impressionText.replace(/However,.*?recommended\./g, "");
        impressionText = impressionText.replace(/Besides,.*?recommended\./g, "");
        impressionText = impressionText.replace(/Clinical correlation is recommended\./g, "");
        
        // 清理重複的空格和句點
        impressionText = impressionText.replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').trim();
        
        // 確保基礎報告以句點結尾
        if (impressionText && !impressionText.endsWith('.')) {
            impressionText += '.';
        }
        
        // 額外處理可能殘留的"slightly hypoperfusion"問題
        impressionText = impressionText.replace(/slightly hypoperfusion/g, 'suspicious hypoperfusion');
        
        // 添加ALZ和DLB的信息
        if (impressionText) {
            impressionText += ' ' + txtAlz + ' ' + txtDlb + ' Clinical correlation is recommended.';
        } else {
            impressionText = txtAlz + ' ' + txtDlb + ' Clinical correlation is recommended.';
        }
        
        // 確保文本格式正確
        impressionText = formatText(impressionText);
        
        // 確保句子開頭的"suspicious"首字母大寫
        impressionText = impressionText.replace(/(^|[.!?]\s+)suspicious/gi, function(match, p1) {
            return p1 + 'Suspicious';
        });
        
        impressionTextarea.value = impressionText;
    } else if (alzCheckbox && alzCheckbox.checked) {
        impressionTextarea.value = reports.alz;
    } else if (dlbCheckbox && dlbCheckbox.checked) {
        impressionTextarea.value = reports.dlb;
    } else {
        impressionTextarea.value = reports.impression;
    }
}

function formatRegions(regions, desc) {
    if (regions.length === 0) return '';
    
    const { BILATERAL_ONLY_AREAS, LOCATIONS } = getConstants();
    
    // 創建一個映射來存儲完整位置及其在原始數組中的索引
    const locationOrder = new Map();
    LOCATIONS.forEach((loc, index) => {
        locationOrder.set(loc, index);
    });
    
    // 按照原始數組的順序排序區域
    const sortedRegions = [...regions].sort((a, b) => {
        const aFullLoc = a.side ? `${a.side} ${a.area}` : a.area;
        const bFullLoc = b.side ? `${b.side} ${b.area}` : b.area;
        return locationOrder.get(aFullLoc) - locationOrder.get(bFullLoc);
    });
    
    const locDescriptions = sortedRegions.map(r => {
        if (BILATERAL_ONLY_AREAS.includes(r.area)) {
            return r.area;
        } else {
            const sidePrefix = r.side ? `${r.side} ` : '';
            // 處理 basal ganglia/ganglion 的特殊情況
            let area = r.area;
            if (area === 'basal ganglia' && r.side && r.side !== 'bilateral') {
                area = 'basal ganglion';  // 單側時使用單數形式
            }
            return `${sidePrefix}${area}`;
        }
    });
    
    if (locDescriptions.length === 1) {
        // 如果只有一個區域，但它是雙側的，使用複數形式
        const isBilateral = sortedRegions[0].side === 'bilateral';
        return `${desc} in the ${locDescriptions[0]} ${isBilateral ? 'regions' : 'region'}`;
    }
    if (locDescriptions.length === 2) {
        return `${desc} in the ${locDescriptions[0]} and ${locDescriptions[1]} regions`;
    }
    return `${desc} in the ${locDescriptions.slice(0, -1).join(', ')}, and ${locDescriptions[locDescriptions.length - 1]} regions`;
}

function createHypoperfusionText(regions, message) {
    if (regions.length === 0) return '';
    
    // 檢查是否應該使用複數形式
    const usePlural = regions.length > 1 || regions.some(region => region.includes('bilateral'));
    
    const regionText = regions.join(", ") + " region" + (usePlural ? "s" : "");
    return "Hypoperfusion in the " + regionText + " " + message;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function pluralizeRegions(text) {
  // Helper function to process a single part
  function processRegionText(part) {
    if (part.trim().endsWith('region')) {
      if (part.includes(' and ') || part.includes('bilateral')) {
        return part.replace(/region$/, 'regions');
      }
    }
    return part;
  }

  // First split by semicolons
  let semicolonParts = text.split(';');
  
  // Process each semicolon-separated part, which might contain periods
  return semicolonParts.map(semicolonPart => {
    // Split each semicolon part by periods
    let periodParts = semicolonPart.split('.');
    
    // Process each period-separated part
    return periodParts.map(periodPart => {
      return processRegionText(periodPart.trim());
    }).join('.');  // Rejoin with periods
  }).join(';');  // Rejoin with semicolons
}

function processReportText(text) {
  if (!text) return text;
  
  // If there are no semicolons or periods, process the whole text
  if (!text.includes(';') && !text.includes('.')) {
    if (text.endsWith('region') && 
        (text.includes(' and ') || text.includes('bilateral'))) {
      return text.replace(/region$/, 'regions');
    }
    return text;
  }
  
  // Process text with pluralization
  return pluralizeRegions(text);
}

// 處理所有文字，確保以句點結尾
function ensurePeriodEnding(text) {
    if (text && !text.endsWith('.')) {
        return text + '.';
    }
    return text;
}

function formatText(text) {
    // 首先確保首字母大寫
    text = text.charAt(0).toUpperCase() + text.slice(1);
    
    // 替換 slightly hypoperfusion 為 suspicious hypoperfusion
    text = text.replace(/slightly hypoperfusion/gi, 'suspicious hypoperfusion');
    
    // 格式化文本
    text = text
        .replace(/\s+/g, ' ')
        .replace(/\.+/g, '.')
        .replace(/\.\s*\./g, '.')
        .replace(/\./g, '. ')
        .trim()
        .replace(/\s*\.$/, '.')
        .replace(/\s\s/g, ' ');
    
    // 確保每句話首字母大寫，包括句號後的句子
    text = text.replace(/([.!?]\s+)([a-z])/g, function(match, p1, p2) {
        return p1 + p2.toUpperCase();
    });
    
    // 特別處理 suspicious，確保句子開頭的"suspicious"首字母大寫
    text = text.replace(/(^|[.!?]\s+)suspicious/gi, function(match, p1) {
        return p1 + 'Suspicious';
    });
    
    return text;
}

function formatNumberedText(impressionArray) {
    if (impressionArray.length === 0) return '';
    if (impressionArray.length === 1) return formatText(impressionArray[0]);
    
    let result = '';
    for (let i = 0; i < impressionArray.length; i++) {
        let text = formatText(impressionArray[i]);
        // 確保每個項目都以句點結尾
        if (!text.endsWith('.')) {
            text += '.';
        }
        // 第一項前不加換行符，其餘項目前添加換行符
        if (i === 0) {
            result += `${i + 1}. ${text}`;
        } else {
            result += `\n${i + 1}. ${text}`;
        }
    }
    return result;
}

function generateAtrophyText() {
    const atrophyFindings = window.atrophyFindings || {
        fissures: false,
        ventricles: false,
        sulci: false,
        interhemisphericFissures: false
    };

    const findings = [];
    if (atrophyFindings.fissures) findings.push("cerebral fissures");
    if (atrophyFindings.ventricles) findings.push("ventricles");
    if (atrophyFindings.sulci) findings.push("cerebral sulci");
    if (atrophyFindings.interhemisphericFissures) findings.push("interhemispheric fissures");
    
    if (findings.length === 0) return "";
    if (findings.length === 1) return `Prominent ${findings[0]} are seen.`;
    if (findings.length === 2) return `Prominent ${findings[0]} and ${findings[1]} are seen.`;
    const last = findings.pop();
    return `Prominent ${findings.join(', ')}, and ${last} are seen.`;
}

function formatCerebellarDiaschisisText(data, severity) {
    const cerebellarRegions = [];
    data.forEach(item => {
        if (item.area.includes('cerebellar')) {
            cerebellarRegions.push(item.fullLocation);
        }
    });
    
    if (cerebellarRegions.length === 0) return '';
    
    let severityText = '';
    switch(severity) {
        case 'marked':
        case 'moderate':
            severityText = 'suspect cross cerebellar diaschisis';
            break;
        case 'mild':
            severityText = 'possible cross cerebellar diaschisis';
            break;
        case 'slight':
            severityText = 'cross cerebellar diaschisis cannot be excluded completely';
            break;
    }
    
    // 檢查是否應該使用複數形式（如果有多個區域或包含雙側區域）
    const usePlural = cerebellarRegions.length > 1 || cerebellarRegions.some(region => region.includes('bilateral'));
    
    return `Hypoperfusion in the ${cerebellarRegions.join(' and ')} region${usePlural ? 's' : ''}, ${severityText}`;
}

function collectDataFromRows() {
    const { hot, BILATERAL_ONLY_AREAS, SIDES } = getConstants();
    
    const currentData = [];
    
    // 從 Handsontable 收集數據
    for (let i = 0; i < hot.countRows(); i++) {
        const location = hot.getDataAtCell(i, 0);
        const severity = hot.getDataAtCell(i, 1);
        
        if (location && severity) {
            let side = '';
            let area = location;
            
            // 處理位置和側面信息
            if (!BILATERAL_ONLY_AREAS.includes(location)) {
                SIDES.forEach(s => {
                    if (location.startsWith(s + ' ')) {
                        side = s;
                        area = location.substring(s.length + 1);
                    }
                });
            }

            currentData.push({
                side: side,
                area: area,
                severity: severity,
                fullLocation: location
            });
        }
    }
    
    return currentData;
}

function generateReports() {
    const data = collectDataFromRows();
    const atrophyFindings = window.atrophyFindings || {
        fissures: false,
        ventricles: false,
        sulci: false,
        interhemisphericFissures: false
    };

    const atrophyText = generateAtrophyText();

    // Generate findings text
    const regAlz = ["posterior cingulate", "posterior parietal", "precuneus"];
    const regDlb = ["occipital"];

    const valMar = data.filter(x => x.severity === 'marked');
    const valMod = data.filter(x => x.severity === 'moderate');
    const valMil = data.filter(x => x.severity === 'mild');
    const valSli = data.filter(x => x.severity === 'slight');

    const txtMar = formatRegions(valMar, 'markedly decreased radioactivity');
    const txtMod = formatRegions(valMod, 'decreased radioactivity');
    const txtMil = formatRegions(valMil, 'mildly decreased radioactivity');
    const txtSli = formatRegions(valSli, 'slightly decreased radioactivity');

    let txtFnd = valMar.concat(valMod, valMil, valSli).length === 0 ? 
        'Tc-99m ECD brain perfusion scan with SPECT shows no definite abnormal radioactivity in the brain.' :
        'Tc-99m ECD brain perfusion scan with SPECT shows ' + [txtMar, txtMod, txtMil, txtSli].filter(x => x !== '').join("; ") + ". ";

    if (atrophyText) {
        txtFnd = txtFnd + (txtFnd.endsWith('  ') ? '' : txtFnd.endsWith(' ') ? '' : ' ') + atrophyText;
    }

    // Generate impression text
    let baseImpressions = [];

    if (window.cerebellarDiaschisis) {
        const nonCerebellarData = data.filter(item => !item.area.includes('cerebellar'));
        const cerebellarData = data.filter(item => item.area.includes('cerebellar'));

        // Generate main impression text without cerebellar regions
        const valMarNonCereb = nonCerebellarData.filter(x => x.severity === 'marked');
        const valModNonCereb = nonCerebellarData.filter(x => x.severity === 'moderate');
        const valMilNonCereb = nonCerebellarData.filter(x => x.severity === 'mild');
        const valSliNonCereb = nonCerebellarData.filter(x => x.severity === 'slight');

        const txtMarNonCereb = formatRegions(valMarNonCereb, 'marked hypoperfusion');
        const txtModNonCereb = formatRegions(valModNonCereb, 'hypoperfusion');
        const txtMilNonCereb = formatRegions(valMilNonCereb, 'mild hypoperfusion');
        const txtSliNonCereb = formatRegions(valSliNonCereb, 'suspicious hypoperfusion');

        let mainText = [txtMarNonCereb, txtModNonCereb, txtMilNonCereb, txtSliNonCereb]
            .filter(x => x !== '')
            .join('; ');

        if (nonCerebellarData.length > 0) {
            // 確保文字以句點結尾
            baseImpressions.push(ensurePeriodEnding(mainText));
        }

        if (cerebellarData.length > 0) {
            const maxSeverity = cerebellarData.reduce((max, item) => {
                const severityOrder = { marked: 4, moderate: 3, mild: 2, slight: 1 };
                return severityOrder[item.severity] > severityOrder[max] ? item.severity : max;
            }, 'slight');

            const diaschisisText = formatCerebellarDiaschisisText(cerebellarData, maxSeverity);
            if (diaschisisText) {
                baseImpressions.push(ensurePeriodEnding(diaschisisText));
            }
        }
    } else {
        const mainImp = valMar.concat(valMod, valMil, valSli).length === 0 ?
            'No definite abnormal cerebral perfusion is detected.' :
            txtFnd.replace('Tc-99m ECD brain perfusion scan with SPECT shows ', '')
                .replace('markedly decreased radioactivity', 'marked hypoperfusion')
                .replace('decreased radioactivity', 'hypoperfusion')
                .replace('mildly decreased radioactivity', 'mild hypoperfusion')
                .replace(/slightly decreased radioactivity/g, 'suspicious hypoperfusion')
                .replace(/\.\s*Prominent.*?are seen\./, '');
        
        baseImpressions.push(ensurePeriodEnding(mainImp));
    }

    if (baseImpressions.length === 0) {
        baseImpressions.push('No definite abnormal cerebral perfusion is detected.');
    }

    // Generate ALZ and DLB specific texts
    let posAlz = regAlz.filter(x => data.some(d => d.area === x));
    let posDlb = regDlb.filter(x => data.some(d => d.area === x));

    let txtAlz = createHypoperfusionText(posAlz, "has been reported to be commonly observed in patients with Alzheimer's disease.");
    let txtDlb = createHypoperfusionText(posDlb, "is considered a supportive biomarker of dementia with Lewy bodies.");

    let txtAlzCor = posDlb.length > 0 ? 
        `${posAlz.length > 0 ? "However" : "Besides"}, hypoperfusion in the occipital area is usually not observed in Alzheimer's disease. Clinical correlation is recommended.` : "";
    let txtDlbCor = posAlz.length > 0 ? "Clinical correlation is recommended." : "";

    txtAlz = txtAlz || "There is no apparently decreased perfusion in the parietal association areas, posterior cingulate, precuneus, which are the regions commonly affected in Alzheimer's disease.";
    txtDlb = txtDlb || "There is no definite evidence of occipital hypoperfusion, a supportive biomarker of dementia with Lewy bodies, observed in this patient.";

    if (txtAlzCor.length > 0) txtAlz = txtAlz + txtAlzCor;
    if (txtDlbCor.length > 0) txtDlb = txtDlb + txtDlbCor;

    // Create final impressions arrays
    let impressions = [...baseImpressions];
    
    // For ALZ and DLB impressions, only add the supportive text to non-cerebellar findings
    let alzImpressions = baseImpressions.map(imp => {
        // If this is a cerebellar diaschisis impression, don't add ALZ text
        if (imp.includes('cerebellar diaschisis')) {
            return imp;
        }
        return imp + (imp.endsWith('.') ? '' : '.') + txtAlz;
    });
    
    let dlbImpressions = baseImpressions.map(imp => {
        // If this is a cerebellar diaschisis impression, don't add DLB text
        if (imp.includes('cerebellar diaschisis')) {
            return imp;
        }
        return imp + (imp.endsWith('.') ? '' : '.') + txtDlb;
    });

    // Add atrophy finding if present
    if (atrophyText) {
        // 檢查 ventricles 是否被選中
        const atrophyDescription = atrophyFindings.ventricles 
            ? "Suspect cerebral cortical atrophy with ventriculomegaly." 
            : "Suspect cerebral cortical atrophy.";
            
        impressions.push(atrophyDescription);
        alzImpressions.push(atrophyDescription);
        dlbImpressions.push(atrophyDescription);
    }

    // 直接在所有文本上做最後的全局替換
    function finalTextProcessing(text) {
        if (!text) return text;
        
        // 替換所有"slightly hypoperfusion"為"suspicious hypoperfusion"
        text = text.replace(/slightly hypoperfusion/gi, 'suspicious hypoperfusion');
        
        // 處理句子開頭的"suspicious"，確保首字母大寫
        text = text.replace(/(^|[.!?]\s+)suspicious/gi, function(match, p1) {
            return p1 + 'Suspicious';
        });
        
        return text;
    }

    // 應用到最終返回的所有報告文本
    return {
        findings: txtFnd,
        impression: finalTextProcessing(formatNumberedText(impressions)),
        alz: finalTextProcessing(formatNumberedText(alzImpressions)),
        dlb: finalTextProcessing(formatNumberedText(dlbImpressions))
    };
}

// 複製報告內容到剪貼簿
async function copyReport(type) {
    try {
        const reports = generateReports();
        const text = reports[type];
        
        if (text === undefined || text === null) {
            throw new Error('No text generated');
        }

        // Create and append textarea
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';  // Make it invisible
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        
        // Select and copy
        textArea.focus();
        textArea.select();
        
        try {
            // Try modern clipboard API first
            await navigator.clipboard.writeText(text);
        } catch (clipError) {
            // Fallback to execCommand
            const success = document.execCommand('copy');
            if (!success) {
                throw new Error('execCommand failed');
            }
        }
        
        // Cleanup
        document.body.removeChild(textArea);
        showNotification('Copied to clipboard');
        
    } catch (err) {
        console.error('Copy failed:', err);
        showNotification(`Failed to copy: ${err.message}`);
    }
} 