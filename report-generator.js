/**
 * ECD Report Generator
 * 負責生成腦部灌注掃描的報告
 */

// 將依賴於全局變量的函數統一接收作為參數，避免直接訪問全局變量
function collectDataFromRows(hot, BILATERAL_ONLY_AREAS, SIDES) {
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

// 获取表格中的数据
function getTableData(locationStatusMap, BILATERAL_ONLY_AREAS, SIDES) {
    const data = [];
    for (const [location, severity] of locationStatusMap) {
        if (severity) {
            let side = '';
            let area = location;
            
            if (!BILATERAL_ONLY_AREAS.includes(location)) {
                SIDES.forEach(s => {
                    if (location.startsWith(s + ' ')) {
                        side = s;
                        area = location.substring(s.length + 1);
                    }
                });
            }

            data.push({
                side: side,
                area: area,
                severity: severity,
                fullLocation: location
            });
        }
    }
    return data;
}

// 格式化区域
function formatRegions(regions, desc, LOCATIONS, BILATERAL_ONLY_AREAS) {
    if (regions.length === 0) return '';
    
    // 创建一个映射来存储完整位置及其在原始数组中的索引
    const locationOrder = new Map();
    LOCATIONS.forEach((loc, index) => {
        locationOrder.set(loc, index);
    });
    
    // 按照原始数组的顺序排序区域
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
            // 处理 basal ganglia/ganglion 的特殊情况
            let area = r.area;
            if (area === 'basal ganglia' && r.side && r.side !== 'bilateral') {
                area = 'basal ganglion';  // 单侧时使用单数形式
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

// 创建低灌注文本
function createHypoperfusionText(regions, message) {
    if (regions.length === 0) return '';
    
    // 檢查是否應該使用複數形式
    const usePlural = regions.length > 1 || regions.some(region => region.includes('bilateral'));
    
    const regionText = regions.join(", ") + " region" + (usePlural ? "s" : "");
    return "Hypoperfusion in the " + regionText + " " + message;
}

// 首字母大写
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// 区域复数化处理
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

// 处理报告文本
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

// 生成萎缩文本
function generateAtrophyText(atrophyFindings) {
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

// 格式化小脑交叉失活文本
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

// 格式化文本
function formatText(text) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
    return text
        .replace(/\s+/g, ' ')
        .replace(/\.+/g, '.')
        .replace(/\.\s*\./g, '.')
        .replace(/\./g, '. ')
        .trim()
        .replace(/\s*\.$/, '.')
        .replace(/\s\s/g, ' ');
}

// 格式化编号文本
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
        result += `\n${i + 1}. ${text}`;
    }
    return result;
}

// 處理所有文字，確保以句點結尾
function ensurePeriodEnding(text) {
    if (text && !text.endsWith('.')) {
        return text + '.';
    }
    return text;
}

// 生成报告的主函数
function generateReports(hot, atrophyFindings, cerebellarDiaschisis, LOCATIONS, BILATERAL_ONLY_AREAS, SIDES) {
    const data = collectDataFromRows(hot, BILATERAL_ONLY_AREAS, SIDES);
    
    // Generate findings text
    const regAlz = ["posterior cingulate", "posterior parietal", "precuneus"];
    const regDlb = ["occipital"];

    const valMar = data.filter(x => x.severity === 'marked');
    const valMod = data.filter(x => x.severity === 'moderate');
    const valMil = data.filter(x => x.severity === 'mild');
    const valSli = data.filter(x => x.severity === 'slight');
    const atrophyText = generateAtrophyText(atrophyFindings);

    const txtMar = formatRegions(valMar, 'markedly decreased radioactivity', LOCATIONS, BILATERAL_ONLY_AREAS);
    const txtMod = formatRegions(valMod, 'decreased radioactivity', LOCATIONS, BILATERAL_ONLY_AREAS);
    const txtMil = formatRegions(valMil, 'mildly decreased radioactivity', LOCATIONS, BILATERAL_ONLY_AREAS);
    const txtSli = formatRegions(valSli, 'slightly decreased radioactivity', LOCATIONS, BILATERAL_ONLY_AREAS);

    let txtFnd = valMar.concat(valMod, valMil, valSli).length === 0 ? 
        'Tc-99m ECD brain perfusion scan with SPECT shows no definite abnormal radioactivity in the brain.' :
        'Tc-99m ECD brain perfusion scan with SPECT shows ' + [txtMar, txtMod, txtMil, txtSli].filter(x => x !== '').join("; ") + ". ";

    if (atrophyText) {
        txtFnd = txtFnd + (txtFnd.endsWith('  ') ? '' : txtFnd.endsWith(' ') ? '' : ' ') + atrophyText;
    }

    // Generate impression text
    let baseImpressions = [];

    if (cerebellarDiaschisis) {
        const nonCerebellarData = data.filter(item => !item.area.includes('cerebellar'));
        const cerebellarData = data.filter(item => item.area.includes('cerebellar'));

        // Generate main impression text without cerebellar regions
        const valMarNonCereb = nonCerebellarData.filter(x => x.severity === 'marked');
        const valModNonCereb = nonCerebellarData.filter(x => x.severity === 'moderate');
        const valMilNonCereb = nonCerebellarData.filter(x => x.severity === 'mild');
        const valSliNonCereb = nonCerebellarData.filter(x => x.severity === 'slight');

        const txtMarNonCereb = formatRegions(valMarNonCereb, 'marked hypoperfusion', LOCATIONS, BILATERAL_ONLY_AREAS);
        const txtModNonCereb = formatRegions(valModNonCereb, 'hypoperfusion', LOCATIONS, BILATERAL_ONLY_AREAS);
        const txtMilNonCereb = formatRegions(valMilNonCereb, 'mild hypoperfusion', LOCATIONS, BILATERAL_ONLY_AREAS);
        const txtSliNonCereb = formatRegions(valSliNonCereb, 'suspicious hypoperfusion', LOCATIONS, BILATERAL_ONLY_AREAS);

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
                .replace('slightly decreased radioactivity', 'suspicious hypoperfusion')
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

    return {
        findings: txtFnd,
        impression: formatNumberedText(impressions),
        alz: formatNumberedText(alzImpressions),
        dlb: formatNumberedText(dlbImpressions)
    };
}

// 導出模塊
export {
    collectDataFromRows,
    getTableData,
    formatRegions,
    createHypoperfusionText,
    capitalizeFirstLetter,
    pluralizeRegions,
    processReportText,
    generateAtrophyText,
    formatCerebellarDiaschisisText,
    formatText,
    formatNumberedText,
    ensurePeriodEnding,
    generateReports
}; 