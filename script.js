let $ = require("jquery");
let dialog = require("electron").remote.dialog;
let fs = require("fs");
const Stack = require("./Stack");
$(document).ready(function () {
    let lsc;
    $("#grid .cell").on("click", function () {
        focusCells(this);
        let rId = Number($(this).attr("rowId")) + 1;
        let cId = Number($(this).attr("colId")) + 65;
        let address = String.fromCharCode(cId) + rId;
        $("#address-input").val(address);
        let { rowId, colId } = getRcId(this);
        let cellObject = db[rowId][colId];
        // console.log(cellObject);
        $("#formula-input").val(cellObject.formula);
        lsc = this;
    })
    function focusCells(elem) {
        $(elem).attr("contenteditable", "true");
        $(elem).focus();
        let rId = Number($(elem).attr("rowId"));
        let cId = Number($(elem).attr("colId"));
        $(`#top-row .cell[cellId=${cId}]`).addClass("active");
        $(`#left-col .cell[cellId=${rId}]`).addClass("active");
    }


    // $("#home").on("focus", function () {
    //     $(this).addClass("active");
    // })
    // $("#home").on("blur", function () {
    //     $(this).removeClass("active");
    // })
    // $("#file").on("focus", function () {
    //     $(this).addClass("active");
    // })
    // $("#file").on("blur", function () {
    //     $(this).removeClass("active");
    // })


    $("#cell-container").on("scroll", function () {
        let vS = $(this).scrollTop();
        let hS = $(this).scrollLeft();
        // console.log(vS + " " + hS);
        $("#tl-cell,#top-row").css("top", vS);
        $("#tl-cell,#left-col").css("left", hS);
    })
    $("#grid .cell").on("keyup", function () {
        let height = $(this).height();
        let cRowId = $(this).attr("rowId");
        //    console.log(height + " " + cRowId);
        let cellElement = $("#left-col .cell")[cRowId];
        $(cellElement).height(height);
    })
    $(".menu").on("click", function () {
        let id = $(this).attr("id");
        $(".menu").removeClass("active");
        $(`#${id}`).addClass("active");
        
        $(".menu-options").removeClass("active");
        $(`#${id}-menu-options`).addClass("active");
        //    $("#"+id+"-menu-options").addClass("active");
    })
    $("#file").on("click",function(){
        $("#file-menu-options").css("display","block");
        
    })
    $("#back").on("click",function(){
        $("#file-menu-options").css("display","none");
    
    })
    //New - Open - Save
    let db = [];
    $("#new").on("click", function () {
        let allRows = $("#grid .row");
        for (let i = 0; i < allRows.length; i++) {
            let row = [];
            let allCellsInARow = $(allRows[i]).find(".cell");
            for (let j = 0; j < allCellsInARow.length; j++) {
                $(allCellsInARow[j]).html("");
                let cell = {
                    value: "",
                    isBold: false,
                    isItalic: false,
                    isUnderLine: false,
                    formula: "",
                    children: [],
                    parent: []
                };
                row.push(cell);
            }
            db.push(row);
        }
    })
    $("#open").on("click", function () {
        let fPaths = dialog.showOpenDialogSync();
        let data = fs.readFileSync(fPaths[0]);
        db = JSON.parse(data);
        // console.log(data);
        let allRows = $("#grid .row");
        for (let i = 0; i < allRows.length; i++) {
            let allCellsInARow = $(allRows[i]).find(".cell");
            for (let j = 0; j < allCellsInARow.length; j++) {
                $(allCellsInARow[j]).html(db[i][j].value);
            }
        }
    })
    $("#save").on("click", function () {
        let fPath = dialog.showSaveDialogSync();
        let sData = JSON.stringify(db);
        fs.writeFileSync(fPath, sData);
        alert("File Saved");
    })

    // bold-italic-underline button
    $("#bold").on("click", function () {
        let { rId, cId } = getRcId(lsc);
        let isBold = db[rId][cId].isBold;
        $(lsc).css('font-weight', isBold ? 'normal' : 'bold');
        db[rId][cId].isBold = !isBold;
    })
    $("#italic").on("click", function () {
        let { rId, cId } = getRcId(lsc);
        let isItalic = db[rId][cId].isItalic;
        $(lsc).css('font-style', isItalic ? 'normal' : 'italic');
        db[rId][cId].isItalic = !isItalic;
    })
    $("#underline").on("click", function () {
        let { rId, cId } = getRcId(lsc);
        let isUnderline = db[rId][cId].isUnderLine;
        $(lsc).css('text-decoration', isUnderline ? 'normal' : 'underline');
        db[rId][cId].isUnderLine = !isUnderline;
    })

    /********************** formula **************/
    function unfocusCells(elem) {
        $(elem).attr("contenteditable", "false");
        let rId = Number($(elem).attr("rowId"));
        let cId = Number($(elem).attr("colId"));
        $(`#top-row .cell[cellId=${cId}]`).removeClass("active");
        $(`#left-col .cell[cellId=${rId}]`).removeClass("active");
    }
    $("#grid .cell").on("blur", function () {
        unfocusCells(this);
        let { rowId, colId } = getRcId(this);
        let value = $(this).html();
        let cellObject = db[rowId][colId];
        console.log(cellObject);
        let cellAddress = $("#address-input").val();
        if (cellObject.formula) {
            removeFormula(cellObject, cellAddress);
        }
        updateCell(rowId, colId, value);
    })
    $("#formula-input").on("blur", function () {
        let formula = $(this).val();
        //jis cell ko update krna h
        let cellAdress = $("#address-input").val();
        //us cell ke rowid colid
        let { rowId, colId } = getRowColFromAddress(cellAdress);
        //jo cell update krna h uska object mnga lo
        let cellObject = db[rowId][colId];
        // removeFormula(cellAdress);
        if (cellObject.formula) {
            removeFormula(cellObject, cellAdress);
        }
        //formula se ans mnga lo
        let ans = evaluate(formula);
        //bta do us cell ko ki uska formula kya hai
        cellObject.formula = formula;
        //us cell ko bolo jake add hojae apne parent ke childrens me
        addToChildrenOfParent(formula, cellAdress);
        //or db or ui update hojao
        updateCell(rowId, colId, ans);
    })
    function addToChildrenOfParent(formula, cellAdress) {
        // ( A1 + A2 )
        let fElements = formula.split(" ");
        for (let i = 0; i < fElements.length; i++) {
            let fComp = fElements[i];

            if (fComp.charAt(0) >= 'A' && fComp.charAt(0) <= 'Z') {

                let { rowId, colId } = getRowColFromAddress(fComp);
                let cellObject = db[rowId][colId];
                cellObject.children.push(cellAdress);
                let selfObject = getRowColFromAddress(cellAdress);
                let currCellObject = db[selfObject.rowId][selfObject.colId];
                currCellObject.parent.push(fComp);
            }
        }
    }
    function updateCell(rowId, colId, ans) {
        $(`#grid .cell[rowId=${rowId}][colId=${colId}]`).html(ans);
        let cellObject = db[rowId][colId];
        cellObject.value = ans;
        // tell your childrens to get updated
        for (let i = 0; i < cellObject.children.length; i++) {
            let cAddress = cellObject.children[i];
            let chObject = getRowColFromAddress(cAddress);
            let chCellObject = db[chObject.rowId][chObject.colId];
            let ans = evaluate(chCellObject.formula);
            updateCell(chObject.rowId, chObject.colId, ans)
        }

    }
    function getRowColFromAddress(cellAdress) {
        // console.log(cellAdress);
        let colId = cellAdress.charCodeAt(0) - 65;
        let rowId = Number(cellAdress.substring(1)) - 1;
        // console.log(colId);
        // console.log(rowId);
        return { rowId, colId };
    }
    function evaluate(formula) {
        let fElements = formula.split(" ");
        for (let i = 0; i < fElements.length; i++) {
            let fComp = fElements[i];
            if (fComp >= 'A' && fComp <= 'Z') {
                let { rowId, colId } = getRowColFromAddress(fComp);
                let val = db[rowId][colId].value;
                formula = formula.replace(fComp, val);
            }
        }
        // console.log(formula);
        let ans = eval(formula);
        return ans;
    }
    function removeFormula(cellObject, cellAddress) {

        for (let i = 0; i < cellObject.parent.length; i++) {
            let parentAddress = cellObject.parent[i];
            let { rowId, colId } = getRowColFromAddress(parentAddress);
            let parentObject = db[rowId][colId];
            let newArr = parentObject.children.filter(function (elem) {
                return elem != cellAddress;
            });
            parentObject.children = newArr;
        }
        cellObject.parent = [];
        cellObject.formula = "";
    }
    function getRcId(elem) {
        let rowId = $(elem).attr("rowId");
        let colId = $(elem).attr("colId");
        return {
            rowId: rowId,
            colId: colId
        }
    }

    // ********************************************************init*******************
    function init() {
        // $("#home").trigger("click");
        $("#new").trigger("click");
    }
    init();
})