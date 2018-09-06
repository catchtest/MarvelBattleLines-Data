'use strict';
var cardEnhance;
var rarityMap = {
    'common': 'C',
    'uncommon': 'U',
    'rare': 'R',
    'epic': 'E',
    'legendary': 'L'
};
var typeMap = {
    'MeleeCharacterCard': 'Char',
    'RangeCharacterCard': 'Char',
    'EventCard': 'Action'
};
var defaultDataTablesOption = {
    "autoWidth": false,
    "order": [],
    "paging": false,
    "info": false,
    "language": {
        "search": "",
        "searchPlaceholder": "快速搜尋",
        "zeroRecords": "找不到符合的資料",
        "emptyTable": "無資料",
    },
    "columnDefs": [{
        targets: 'no-sort',
        orderable: false
    }, {
        targets: 'job',
        orderDataType: "img-src"
    }]
};
var db;

(function($) {
    $(function() {
		$.fn.dataTable.enum( [ 'C', 'U', 'R', 'E' ] );
		
        // 顯示讀取資料錯誤訊息
        $.ajaxSetup({
            "error": function(jqXHR, textStatus, errorThrown) {
                if (jqXHR.status == 404) {
                    alert("File not found.");
                } else {
                    alert("Error: " + textStatus + ": " + errorThrown);
                }
            }
        });

        // 讀取Json
        $.when($.getJSON('data/data.json')).done(function(db) {
			window.db = this.db;
			var cardData = db["CardData"]
            var cardEnhance = db["CardLevelEnhanceData"];
            var localized = db["Localized"];

            /* 取得卡片攻擊跟HP數值 */
            var cardValue = function(rarity, level, value) {
                rarity = capitalizeFirstLetter(rarity);
                var newValue = Math.round(value * cardEnhance[level][rarity] / 100);
                return newValue === 0 ? '' : newValue;
            };

            /* 取得技能說明 */
            var skillText = function(data, level) {
                // 卡片沒有該等級時不顯示
                if (data.maxCardLevel < level - 1) {
                    return '';
                }

                var text = data.textKey ? localized[data.textKey]['cht'] || data.text : '';

                switch (level) {
                    case 1:
                        return String.Format(text, data.triggerValue1, data.triggerValue2, data.triggerValue3);
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                        level -= 1;
                        return String.Format(text, data["triggerValue1Level" + level], data["triggerValue2Level" + level], data["triggerValue3Level" + level]);
                    default:
                        throw 'undefined level';
                }
            }

            var cardDataTmpl = Template7.compile($("#cardDataTmpl").html());
            var cardList = [];

            for (var key in cardData) {
                var data = cardData[key];

                // 以下卡片現階段玩家無法獲得，跳過
                if (data.storyOnly) {
                    continue;
                } else if (data.progress !== 'completed') {
                    continue;
                } else if (data.name.endsWith('NOS')) {
                    continue;
				}

                // 自己訂別名
                data.rarityName = rarityMap[data.rarity];
                data.cardTypeName = typeMap[data.cardType];
                data.actionCard = data.cardType === 'EventCard';

                // 先計算屬性，減少延遲
                data.chineseName = localized[data.currentAliasKey]['cht'];
                data.englishName = localized[data.currentAliasKey]['eng'];
                data.atk1 = data.actionCard ? '' : data.atk;
                data.hp1 = data.actionCard ? '' : data.hp;
                data.sum1 = data.actionCard ? '' : data.atk1 + data.hp1;
                data.atk2 = cardValue(data.rarity, '1', data.atk);
                data.hp2 = cardValue(data.rarity, '1', data.hp);
                data.sum2 = data.atk2 + data.hp2;
                data.atk3 = cardValue(data.rarity, '2', data.atk);
                data.hp3 = cardValue(data.rarity, '2', data.hp);
                data.sum3 = data.atk3 + data.hp3;

                data.skill1 = skillText(data, 1);
                data.skill2 = skillText(data, 2);
                data.skill3 = skillText(data, 3);
				
				data.fileName = data.name.toLowerCase();

                cardList.push(data);
            }

            cardList.sort(function(a, b) {
                return ('' + a.englishName).localeCompare(b.englishName);
            });

            //$("#cardDataTable > tbody").html(cardDataTmpl(cardList));

			renderTable("cardDataTable", cardDataTmpl(cardList), null);
			
            $("[data-filter-target]").change(function() {
                var targetClass = $(this).data("filter-target");
                $(targetClass).toggle(this.checked);
            }).change();
			
			$("[data-filter-row]").change(function(){
				$("tr.hidden").removeClass("hidden");
				
				$("[data-filter-row]:not(:checked)").each(function(){
					var targetClass = $(this).data("filter-row");
					$(targetClass).addClass("hidden");
				});
			});
			
			$(".loader").hide();
        });
		
		function renderTable(id, html, dataTablesOption) {
			var $table = $("#" + id);
			$table.children("tbody").html(html);
			$table.DataTable(dataTablesOption || defaultDataTablesOption);
		}
    });
})(jQuery);

/* 一些擴充方法 */
if (!String.Format) {
    String.Format = function(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined' ?
                args[number] :
                match;
        });
    };
}

if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function(prefix) {
        return this.slice(0, prefix.length) === prefix;
    };
}

if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

/* 把第一個字元變成大寫 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

window.onerror = function(errorMsg, url, lineNumber, column, errorObj) {
    alert('Error: ' + errorMsg + '\nScript: ' + url + '\nLine: ' + lineNumber +
        '\nColumn: ' + column + '\nStackTrace: ' + errorObj);
}