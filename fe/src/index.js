import ReactDOM from 'react-dom';
import React, { useEffect, useState } from "react";
import { Layout, Divider, Menu, Radio, notification ,Select, Button, Tag, Input, Empty  } from 'antd';
import { DownloadOutlined, UndoOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { CSVReader } from 'react-papaparse'
import ReactEcharts from 'echarts-for-react'

import 'antd/dist/antd.css';
import './style/mainpage.css';
import Operation from 'antd/lib/transfer/operation';

const { Header, Footer } = Layout;
const buttonRef = React.createRef()
const { Search } = Input;
const { Option } = Select;

const opName = {
  'readOnly' : "只读模式",
  'rangeOp' : "范围操作模式",
  'pointOp' : "点操作模式",
}
const noiseThreshold = 3;  //噪音波动范围

const ChartShop = () => {

  const [sourceData, setSourceData] = useState([]);      //原始数据
  const [operationStack, setOperationStack] = useState([]);  //数据修改记录
  const [curData, setCurData] = useState([]);            //当前数据
  const [curRange, setCurRange] = useState([0,0]);       //当前选中范围
  const [curSelected, setCurSelected] = useState(-1);    //当前选中的点下标
  const [clipBoard, setClipBoard] = useState([]);        //当前剪贴板内容
  const [editMode, setEditMode] = useState("readOnly");  //编辑模式 "readOnly":只读模式（不可操作） "rangeOp":范围操作  "pointOp":点操作
  const [moveDelt, setMoveDelt] = useState(5);           //平移步长

  const onHandleOpenDialog = (e) => {
    if (buttonRef.current) {
      buttonRef.current.open(e)
    }
  }

  const handleOnFileLoad = (data, f) => { 
    setSourceData(data.map((item)=>parseFloat(item.data[1])));
    setCurData(data.map((item)=>parseFloat(item.data[1])));
  }

  useEffect(() => {
    if(editMode != 'rangeOp') {
      setCurRange([0,0]);
    }
    if(editMode != 'pointOp' && editMode != 'insertOp') {
      setCurSelected(-1);
    }
    if(editMode == 'pointOp') {

    }
  }, [editMode, curSelected]);

  const handleOnError = (err, file, inputElem, reason) => {
    alert(err);
  }

  const onDownloadData = () => {
    let fileName = "data.csv";
    let formatData = curData.map((v,k)=>`${k},${v}`);
    formatData = formatData.join('\n');
    let pom = document.createElement('a');
    pom.setAttribute('href', 'data:attachment/csv;charset=utf-8,' +"\uFEFF"+ encodeURIComponent(formatData));
    pom.setAttribute('download', fileName);
    if (document.createEvent) {
      let evt = document.createEvent('MouseEvents');
      evt.initEvent('click', true, true);
      pom.dispatchEvent(evt);
    } else {
      pom.click();
    }
  }

  const onUndo = () => {
    if(operationStack.length == 0) {
      notification.info({
        message: '已经回到起始状态',
      })
    } else {
      
      let lastOper = operationStack.pop();
      console.log(lastOper);
      if(lastOper.type == 'range') {
        setCurRange(lastOper.detail.range);
        switch(lastOper.subtype) {
          case 'delete':{
            insertData(lastOper.detail.range[0] - 1, lastOper.detail.deletedData);
          }break;
          case 'move':{
            move(lastOper.detail.range, -lastOper.detail.step);
          }break;
          case 'noise':{
            let temp = curData;
            let noise = lastOper.detail.noiseData; //噪音
            let range = lastOper.detail.range;
            for(let i = range[0], j = 0; i <= range[1]; i++, j++) {
              temp[i] -= noise[j];
            }
            setCurData(temp);
            echarts_react.getEchartsInstance().setOption(option);
          }break;
          case 'flipX':{
            flipX(lastOper.detail.range);
          }break;
          case 'flipY':{
            flipY(lastOper.detail.range);
          }break;
          case 'cut' : {
            insertData(lastOper.detail.range[0] - 1, lastOper.detail.cutted);
          }break;
        }
      } else {
        setCurSelected(lastOper.detail.selected);
        switch(lastOper.subtype) {
          case 'delete':{
            insertData(lastOper.detail.selected - 1, [lastOper.detail.data]);
          }break;
          case 'move':{
            move([lastOper.detail.selected, lastOper.detail.selected], -lastOper.detail.step);
          }break;
          case 'paste':{
            let temp = curData;
            temp.splice(lastOper.detail.selected + 1, lastOper.detail.length);
            echarts_react.getEchartsInstance().setOption(option);
            setCurData(temp);
          }break;
        }
      }
      echarts_react.getEchartsInstance().setOption(option);
      setOperationStack([...operationStack]);
    }
  }

  const onResetData = () => {
    setCurData(sourceData.map(v=>v));
    setOperationStack([]);//清空所有操作
  }

  const onHandleChange = (value) => {
    setMoveDelt(parseInt(value));
  }

  //=========================范围操作模式相关 START ==========================
  const checkArea = () => {
    if(curRange[0] == 0 && curRange[1] == 0) {
      notification.warning({
        message: '操作失败',
        description:
          '请先选择一个范围',
      })
      return false;
    }
    return true;
  }

  const onRangeSelected = (v) => {
    if(!/^[0-9]+-[0-9]+$/.test(v)) {
      notification.warning({
        message: '输入非法',
        description:
          '按照a-b格式输入',
      })
      return;
    } 

    let r = v.split('-');
    r[0] = parseInt(r[0]);
    r[1] = parseInt(r[1]);
    if(r[0] > r[1] || r[0] > curData.length || r[1] >= curData.length) {
      notification.warning({
        message: '输入非法',
        description:
          '起始下标应>=结束下标，且二者取值都在范围内',
      })
      return;
    } 
    setCurRange([r[0], r[1]]);
  }
  
  const onCopyData = () => {
    if(!checkArea())return;
    setClipBoard(curData.slice(curRange[0], curRange[1] + 1));
    notification.info({
      message: '复制成功',
      description:
        `复制范围：[${curRange[0]},${curRange[1]}]`,
    })
  }

  const onSelectAll = () => {
    setCurRange([0, curData.length - 1]);
  }

  const onResetRange = () => {
    setCurRange([0, 0]);
  }

  const onDeleteRange = () => {
    if(!checkArea())return;
    let temp = curData;
    let deleted = temp.splice(curRange[0], curRange[1] - curRange[0] + 1);
    echarts_react.getEchartsInstance().setOption(option);
    setCurData(temp);
    setCurRange([0,0]);
    // notification.info({
    //   message: '删除成功',
    //   description:
    //     `删除数据范围：[${curRange[0]},${curRange[1]}]`,
    // })

    let operation = {
      'description' : `删除区间：[${curRange[0]},${curRange[1]}]`,
      'type' : 'range',
      'subtype' : 'delete',
      'detail' : {
        'deletedData' : deleted,
        'range' : [curRange[0], curRange[1]],
      }
    };
    setOperationStack([...operationStack, operation]);
  }

  const onAddNoise = () => {
    if(!checkArea())return;
    let temp = curData;
    let noise = []; //噪音
    for(let i = curRange[0]; i <= curRange[1]; i++) {
      let ns = parseInt(Math.random()*(2*noiseThreshold+1)-noiseThreshold,10);
      temp[i] += ns;
      noise.push(ns);
    }
    setCurData(temp);
    echarts_react.getEchartsInstance().setOption(option);
    
    // notification.info({
    //   message: '加噪音成功',
    //   description:
    //     `加噪音数据范围：[${curRange[0]},${curRange[1]}]`,
    // })

    let operation = {
      'description' : `在区间[${curRange[0]},${curRange[1]}]上加噪音`,
      'type' : 'range',
      'subtype' : 'noise',
      'detail' : {
        'noiseData' : noise,
        'range' : [curRange[0],curRange[1]]
      }
    };
    setOperationStack([...operationStack, operation]);
  }

  const onCurryingRangeMove = (dir) => {
    return function () {
      if(!checkArea())return;
      let d = dir == 1 ? moveDelt : -moveDelt;
      move(curRange, d);

      let operation = {
        'description' : `区间[${curRange[0]},${curRange[1]}]整体${ dir == 1 ? '上' : '下'}移${moveDelt}个单位`,
        'type' : 'range',
        'subtype' : 'move',
        'detail' : {
          'step' : d,
          'range' : [curRange[0],curRange[1]]
        }
      };
      setOperationStack([...operationStack, operation]);
    }
  }

  const onFlipX = () => {
    if(!checkArea())return;
    flipX(curRange);

    let operation = {
      'description' : `区间[${curRange[0]},${curRange[1]}]整体左右翻转`,
      'type' : 'range',
      'subtype' : 'flipX',
      'detail' : {
        'range' : [curRange[0],curRange[1]]
      }
    };
    setOperationStack([...operationStack, operation]);
  }

  const onFlipY = () => {
    if(!checkArea())return;
    flipY(curRange);

    let operation = {
      'description' : `区间[${curRange[0]},${curRange[1]}]整体上下翻转`,
      'type' : 'range',
      'subtype' : 'flipY',
      'detail' : {
        'range' : [curRange[0],curRange[1]]
      }
    };
    setOperationStack([...operationStack, operation]);
  }

  const onCutData = () => {
    if(!checkArea())return;
    setClipBoard(curData.slice(curRange[0], curRange[1] + 1));
    let temp = curData;
    let cutted = temp.splice(curRange[0], curRange[1] - curRange[0] + 1);
    echarts_react.getEchartsInstance().setOption(option);
    setCurData(temp);
    setCurRange([0,0]);
    notification.info({
      message: '剪切成功',
      description:
        `剪切范围：[${curRange[0]},${curRange[1]}]`,
    })

    let operation = {
      'description' : `剪切区间：[${curRange[0]},${curRange[1]}]`,
      'type' : 'range',
      'subtype' : 'cut',
      'detail' : {
        'cutted' : cutted,
        'range' : [curRange[0], curRange[1]],
      }
    };
    setOperationStack([...operationStack, operation]);
  }
  //========================= 范围操作模式相关 END ==========================


  //========================= 点操作相关 START ==============================
  const checkPoint = () => {
    if(curSelected == -1) {
      notification.warning({
        message: '操作失败',
        description:
          '请先选中一个下标',
      })
      return false;
    }
    return true;
  }
  
  const onPasteData = () => {
    if(!checkPoint())return;
    if(clipBoard.length == 0) {
      notification.warning({
        message: '操作失败',
        description:
          '剪贴板无数据！',
      })
      return false;
    } 

    insertData(curSelected, clipBoard);

    let operation = {
      'description' : `${curSelected}点后插入数据`,
      'type' : 'point',
      'subtype' : 'paste',
      'detail' : {
        'selected' : curSelected,
        'length' : clipBoard.length
      }
    };
    setOperationStack([...operationStack, operation]);

  }

  const onCurryingPointMove = (dir) => {
    return function () {
      if(!checkPoint())return;
      let d = dir == 1 ? moveDelt : -moveDelt;
      let temp = curData;
      temp[curSelected] += d;
      setCurData(temp);
      option.series[0].markPoint.data[0].coord = [curSelected, temp[curSelected] + d]
      echarts_react.getEchartsInstance().setOption(option);

      let operation = {
        'description' : `点${curSelected}${ dir == 1 ? '上' : '下' }移${moveDelt}个单位`,
        'type' : 'point',
        'subtype' : 'move',
        'detail' : {
          'step' : d,
          'selected' : curSelected
        }
      };
      setOperationStack([...operationStack, operation]);
    }
  }

  const onDeletePoint = () => {
    if(!checkPoint())return;
    let temp = curData;
    let deleted = temp.splice(curSelected, 1);
    echarts_react.getEchartsInstance().setOption(option);
    setCurData(temp);
    setCurSelected(-1);
    notification.info({
      message: '删除成功',
      description:
        `删除数据下标：[${curSelected}]`,
    })

    let operation = {
      'description' : `删除点${curSelected}`,
      'type' : 'point',
      'subtype' : 'delete',
      'detail' : {
        'selected' : curSelected,
        'data' : deleted[0]
      }
    };
    setOperationStack([...operationStack, operation]);
  }

  const onPointSelected = (v) => {
    if(!/^[0-9]+$/.test(v)) {
      notification.warning({
        message: '输入非法',
        description:
          '请输入正整数',
      })
      return;
    } 
    v = parseInt(v);
    if(v >= curData.length) {
      notification.warning({
        message: '输入非法',
        description:
          '下标应该在当前数据长度范围内',
      })
    } else {
      setCurSelected(v);
    }
}

//========================= 点操作相关 END ==============================

//======================================================

const insertData = (index, data) => {
  let _left = curData.slice(0, index + 1);
  let _right = curData.slice(index + 1, curData.length);
  setCurData(_left.concat(data).concat(_right));
  echarts_react.getEchartsInstance().setOption(option);
}

const move = (range, delt) => {
  let temp = curData;
  for(let i = range[0]; i <= range[1]; i++) {
    temp[i] += delt;
  }
  setCurData(temp);
  echarts_react.getEchartsInstance().setOption(option);
}

const flipX = (range) => {
  let temp = curData;
  let temp_1 = curData.map(v=>v);
  for(let i = range[0], j = range[1]; i <= range[1]; i++, j--) {
    temp[i] = temp_1[j];
  }
  setCurData(temp);
  echarts_react.getEchartsInstance().setOption(option);
}

const flipY = (range) => {
  let _max = curData[range[0]];
  let _min = curData[range[0]];
  let temp = curData;
  for(let i = range[0]; i < range[1]; i++) {
    if(temp[i] > _max) {
      _max = temp[i];
    }
    if(temp[i] < _min) {
      _min = temp[i];
    }
  }
  let _axis = (_max + _min)/2;
  for(let i = range[0]; i < range[1]; i++) {
    temp[i] -= 2*(temp[i] - _axis);
  }
  setCurData(temp);
  echarts_react.getEchartsInstance().setOption(option);
}

//========================================================

  let echarts_react = null;

  const option = {
    title: {
      text: `最新数据：（${opName[editMode]}）`,
      subtext: `上一步操作：${operationStack.length == 0 ? '无操作' : operationStack[operationStack.length - 1]['description']}`,
      left: 'center',
      align: 'right'
    },
    tooltip: {
      trigger: 'axis'
    },
    dataZoom: [
      {
        show: true,
      },
      {
        type: 'inside',
      }
    ],
    xAxis: {
        type: 'category',
        data: Array.from([...Array(curData.length)].keys())
    },
    yAxis: {
        type: 'value'
    },
    series: [
      {
        data:  curData,
        type: 'line',
        lineStyle: {
          width: 2
        },
        markPoint: {
          symbolSize: 20, 
          symbol: "arrow", 
          data: [
              {
                coord: [curSelected,curData[curSelected]],
                name: '当前选中',
                itemStyle: {
                  color: 'rgb(0,255,0)',
                  borderColor : 'rgb(0,0,255)',
                  borderWidth: 2,
                },
              },
          ]
        },
        markArea: {
          silent: true,
          itemStyle: {
            color: 'rgba(0,0,0,0.3)'
          },
          data: [[{
              xAxis: curRange[0]
          }, {
              xAxis: curRange[1]
          }]]
      },
      },
    ]
  };

  return (
    <Layout>
      <Header className="header" style={{padding:"0 10px"}}>
        <div className="logo" style={{color:"white",fontSize:"23px"}}>
          Chart Shop v3.6
        </div>
      </Header>
      <div className="main-page"> 
          <div className="side-content box-shadow"> 
            {
              sourceData.length == 0 ? (<h1>控制面板</h1>) : (
                <>
                <div className="control-panel-root">
                <div className="control-panel" style={{marginTop:"0px", height:"80px"}}>
                  <Radio checked={editMode=='readOnly'} onClick={()=>{setEditMode('readOnly');}}>只读模式</Radio>
                  <hr />
                  <p style={{color:editMode=='readOnly' ? "red" : "gray"}}>不能进行任何操作</p>
                </div>
                  
                <div className="control-panel">
                  <Radio checked={editMode=='rangeOp'} onClick={()=>{setEditMode('rangeOp');}}>范围操作模式</Radio>
                  <hr />
                  <Search disabled={editMode!='rangeOp'}  size="small" placeholder="a-b" enterButton="选中"  onSearch={onRangeSelected} />    
                  <Button
                    disabled={editMode!='rangeOp'}
                    onClick={onResetRange}
                    style={{width:"48%",marginRight:"4px"}} size={"small"} 
                  >
                    重置
                  </Button>
                  <Button
                    disabled={editMode!='rangeOp'}
                    onClick={onSelectAll}
                    style={{width:"48%", marginTop:"3px"}} size={"small"} 
                  >
                    全选
                  </Button>

                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    onClick={onAddNoise}
                    type="dashed" style={{width:"100%", marginTop:"3px"}} size={"small"} 
                  >
                    加噪音
                  </Button>

                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    type='dashed'
                    onClick={onCurryingRangeMove(1)}
                    style={{width:"48%",marginRight:"6px", marginTop:"3px"}} size={"small"} 
                  >
                    上移
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    type='dashed'
                    onClick={onCurryingRangeMove(-1)}
                    style={{width:"48%", marginTop:"3px"}} size={"small"} 
                  >
                    下移
                  </Button>

                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    type='dashed'
                    onClick={onFlipX}
                    style={{width:"48%",marginRight:"6px", marginTop:"3px"}} size={"small"} 
                  >
                    左右翻转
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    type='dashed'
                    onClick={onFlipY}
                    style={{width:"48%", marginTop:"3px"}} size={"small"} 
                  >
                    上下翻转
                  </Button>

                  <Button
                    disabled={editMode!='rangeOp'}
                    danger
                    type="primary" 
                    onClick={onDeleteRange}
                    style={{width:"100%", marginTop:"3px"}} size={"small"} 
                  >
                    删除
                  </Button>

                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    onClick={onCopyData}
                    type="dashed" style={{width:"48%",marginRight:"6px", marginTop:"3px"}} size={"small"} 
                  >
                    复制
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    onClick={onCutData}
                    type="dashed" style={{width:"48%", marginTop:"3px"}} size={"small"} 
                  >
                    剪切
                  </Button>

                </div>


                <div className="control-panel" style={{height:"140px"}}>
                  <Radio  checked={editMode=='pointOp'} onClick={()=>{setEditMode('pointOp');}}>点操作模式</Radio>
                  <hr />
                  <Search disabled={editMode!='pointOp'}  size="small" placeholder="输入下标" enterButton="选中"  onSearch={onPointSelected} />    
                  <Button
                    danger
                    disabled={editMode!='pointOp'}
                    onClick={onCurryingPointMove(1)}
                    type="dashed" style={{width:"48%", marginRight:"6px", marginTop:"3px"}} size={"small"} 
                  >
                    上移
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='pointOp'}
                    onClick={onCurryingPointMove(-1)}
                    type="dashed" style={{width:"48%", marginTop:"3px"}} size={"small"} 
                  >
                    下移
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='pointOp'}
                    onClick={onDeletePoint}
                    type="primary" style={{width:"48%", marginRight:"6px", marginTop:"3px"}} size={"small"} 
                  >
                    删除
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='pointOp'}
                    onClick={onPasteData}
                    type="dashed" style={{width:"48%", marginTop:"3px"}} size={"small"} 
                  >
                    粘贴
                  </Button>
                </div>

                </div>
                </>
              )
            }
            
          </div>


          <div className="common-control-panel box-shadow">

            <div style={{width:"100px", height:"100%", float:"left", marginRight:"10px"}}>
              <CSVReader
                  ref={buttonRef}
                  onFileLoad={handleOnFileLoad}
                  onError={handleOnError}
                  noClick
                  noDrag
                >
                  {({ file }) => (
                      <Button
                        danger
                        type='button'
                        onClick={onHandleOpenDialog}
                        type="primary" icon={<PlusOutlined />} style={{width:"100px"}} size={"small"} 
                      >
                      导入数据
                      </Button>
                  )}
              </CSVReader>
            </div>

            {
              sourceData.length == 0 ? (<></>) : (
                <>
                  <Button
                        type='button'
                        onClick={onResetData}
                        type="primary" icon={<ReloadOutlined />} style={{marginRight:"10px", width:"100px"}} size={"small"} 
                      >
                        重置数据
                  </Button>
                  <Button
                        type='button'
                        onClick={onDownloadData}
                        type="primary" icon={<DownloadOutlined />} style={{marginRight:"10px", width:"100px"}} size={"small"} 
                      >
                        下载数据
                  </Button>
                  <Button
                        type='button'
                        onClick={onUndo}
                        type="dashed" icon={<UndoOutlined />} style={{marginRight:"10px", width:"100px"}} size={"small"} 
                      >
                        回退操作
                  </Button>
                  单次平移步长：
                  <Select defaultValue="5" size="small" style={{ width: 120, height: 20 }}  onChange={onHandleChange}>
                    <Option value="1">1</Option>
                    <Option value="2">2</Option>
                    <Option value="3">3</Option>
                    <Option value="4">4</Option>
                    <Option value="5">5</Option>
                    <Option value="6">6</Option>
                    <Option value="7">7</Option>
                    <Option value="8">8</Option>
                    <Option value="9">9</Option>
                    <Option value="10">10</Option>
                  </Select>
                </>)
            }
          </div>
          <div className="main-content box-shadow">
            {
              sourceData.length == 0 ? (<Empty />) : (<>
                <div className="info-panel">
                  <Tag visible={curData.length != 0 } color="magenta">当前数据长度：{curData.length}</Tag>
                  <Tag visible={curData.length != 0 } color="cyan">当前剪贴板数据长度：{clipBoard.length}</Tag>
                  <Tag visible={curData.length != 0 } color="green">当前选中范围：[{curRange[0]}, {curRange[1]}]</Tag>
                  <Tag visible={curData.length != 0 } color="orange">当前选中的点：{curSelected}</Tag>
                  <Tag visible={curData.length != 0 } color="green">可回退步数：{operationStack.length}</Tag>
                </div>
                <div className=".chart-container box-shadow"> 
                  <ReactEcharts
                    option={ option }
                    style={{height: '450px', width: '100%'}}
                    ref={(e) => { echarts_react = e }}
                  />
                </div></>
              )
            }
          </div>
        </div>

      <Footer style={{ textAlign: 'center' }}>Ant Design ©2020 Created by Qiyuxing </Footer>
    </Layout>
  );
};
export default ChartShop;
ReactDOM.render(<ChartShop />, document.getElementById("root"));