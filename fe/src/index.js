import ReactDOM from 'react-dom';
import React, { useEffect, useState } from "react";
import { Layout, Divider, Menu, Radio, notification ,Select, Button, Tag, Input, Empty  } from 'antd';
import { DownloadOutlined, UndoOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { CSVReader } from 'react-papaparse'
import ReactEcharts from 'echarts-for-react'

import 'antd/dist/antd.css';
import './style/mainpage.css';

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
  const [changeRecord, setChangeRecord] = useState([]);  //数据修改记录
  const [curData, setCurData] = useState([]);            //当前数据
  const [curRange, setCurRange] = useState([0,0]);       //当前选中范围
  const [curSelected, setCurSelected] = useState(-1);    //当前选中的点下标
  const [clipBoard, setClipBoard] = useState([]);        //当前剪贴板内容
  const [editMode, setEditMode] = useState("readOnly");  //编辑模式 "readOnly":只读模式（不可操作） "rangeOp":范围操作  "pointOp":点操作
  const [moveDelt, setMoveDelt] = useState(5);           //平移步长

  const handleOpenDialog = (e) => {
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

  const downloadData = () => {
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

  const undo = () => {
    notification.info({
      message: '开发中',
      description:
        '敬请期待',
    })
  }

  const resetData = () => {
    setCurData(sourceData.map(v=>v));
  }

  const handleChange = (value) => {
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
  
  const copyData = () => {
    if(!checkArea())return;
    setClipBoard(curData.slice(curRange[0], curRange[1] + 1));
    notification.info({
      message: '复制成功',
      description:
        `复制范围：[${curRange[0]},${curRange[1]}]`,
    })
  }

  const selectAll = () => {
    setCurRange([0, curData.length - 1]);
  }

  const resetRange = () => {
    setCurRange([0, 0]);
  }

  const deleteRange = () => {
    if(!checkArea())return;
    let temp = curData;
    temp.splice(curRange[0], curRange[1] - curRange[0] + 1);
    echarts_react.getEchartsInstance().setOption(option);
    setCurData(temp);
    setCurRange([0,0]);
    notification.info({
      message: '删除成功',
      description:
        `删除数据范围：[${curRange[0]},${curRange[1]}]`,
    })
  }

  const addNoise = () => {
    if(!checkArea())return;
    let temp = curData;
    for(let i = curRange[0]; i <= curRange[1]; i++) {
      temp[i] += parseInt(Math.random()*(2*noiseThreshold+1)-noiseThreshold,10);;
    }
    setCurData(temp);
    echarts_react.getEchartsInstance().setOption(option);
    
    notification.info({
      message: '加噪音成功',
      description:
        `加噪音数据范围：[${curRange[0]},${curRange[1]}]`,
    })
  }

  const curryingRangeMove = (dir) => {
    return function () {
      if(!checkArea())return;
      let d = dir == 1 ? moveDelt : -moveDelt;
      let temp = curData;
      for(let i = curRange[0]; i <= curRange[1]; i++) {
        temp[i] += d;
      }
      setCurData(temp);
      echarts_react.getEchartsInstance().setOption(option);
    }
  }

  const flipX = () => {
    if(!checkArea())return;
    let temp = curData;
    let temp_1 = curData.map(v=>v);
    for(let i = curRange[0], j = curRange[1]; i <= curRange[1]; i++, j--) {
      temp[i] = temp_1[j];
    }
    setCurData(temp);
    echarts_react.getEchartsInstance().setOption(option);
  }

  const flipY = () => {
    if(!checkArea())return;
    let _max = curData[curRange[0]];
    let _min = curData[curRange[0]];
    let temp = curData;
    for(let i = curRange[0]; i < curRange[1]; i++) {
      if(temp[i] > _max) {
        _max = temp[i];
      }
      if(temp[i] < _min) {
        _min = temp[i];
      }
    }
    let _axis = (_max + _min)/2;
    for(let i = curRange[0]; i < curRange[1]; i++) {
      temp[i] -= 2*(temp[i] - _axis);
    }
    setCurData(temp);
    echarts_react.getEchartsInstance().setOption(option);
  }

  const cutData = () => {
    if(!checkArea())return;
    setClipBoard(curData.slice(curRange[0], curRange[1] + 1));
    let temp = curData;
    temp.splice(curRange[0], curRange[1] - curRange[0] + 1);
    echarts_react.getEchartsInstance().setOption(option);
    setCurData(temp);
    setCurRange([0,0]);
    notification.info({
      message: '剪切成功',
      description:
        `剪切范围：[${curRange[0]},${curRange[1]}]`,
    })
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
  
  const pasteData = () => {
    if(!checkPoint())return;
    if(clipBoard.length == 0) {
      notification.warning({
        message: '操作失败',
        description:
          '剪贴板无数据！',
      })
      return false;
    } 

    let temp = curData;
    let _left = curData.slice(0, curSelected + 1);
    let _right = curData.slice(curSelected + 1, curData.length);
    setCurData(_left.concat(clipBoard).concat(_right));
    echarts_react.getEchartsInstance().setOption(option);
  }

  const curryingPointMove = (dir) => {
    return function () {
      if(!checkPoint())return;
      let d = dir == 1 ? moveDelt : -moveDelt;
      let temp = curData;
      temp[curSelected] += d;
      setCurData(temp);
      option.series[0].markPoint.data[0].coord = [curSelected, temp[curSelected] + d]
      echarts_react.getEchartsInstance().setOption(option);
    }
  }

  const deletePoint = () => {
    if(!checkPoint())return;
    let temp = curData;
    temp.splice(curSelected, 1);
    echarts_react.getEchartsInstance().setOption(option);
    setCurData(temp);
    setCurSelected(-1);
    notification.info({
      message: '删除成功',
      description:
        `删除数据下标：[${curSelected}]`,
    })
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

  let echarts_react = null;

  const option = {
    title: {
      text: `最新数据：（${opName[editMode]}）`,
      subtext: '上一步操作：todo',
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
        <div className="logo" style={{color:"white",fontSize:"28px"}}>
          数据编辑器v3.6
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
                    onClick={resetRange}
                    style={{width:"48%",marginRight:"4px"}} size={"small"} 
                  >
                    重置
                  </Button>
                  <Button
                    disabled={editMode!='rangeOp'}
                    onClick={selectAll}
                    style={{width:"48%", marginTop:"3px"}} size={"small"} 
                  >
                    全选
                  </Button>

                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    onClick={addNoise}
                    type="dashed" style={{width:"100%", marginTop:"3px"}} size={"small"} 
                  >
                    加噪音
                  </Button>

                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    type='dashed'
                    onClick={curryingRangeMove(1)}
                    style={{width:"48%",marginRight:"6px", marginTop:"3px"}} size={"small"} 
                  >
                    上移
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    type='dashed'
                    onClick={curryingRangeMove(-1)}
                    style={{width:"48%", marginTop:"3px"}} size={"small"} 
                  >
                    下移
                  </Button>

                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    type='dashed'
                    onClick={flipX}
                    style={{width:"48%",marginRight:"6px", marginTop:"3px"}} size={"small"} 
                  >
                    左右翻转
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    type='dashed'
                    onClick={flipY}
                    style={{width:"48%", marginTop:"3px"}} size={"small"} 
                  >
                    上下翻转
                  </Button>

                  <Button
                    disabled={editMode!='rangeOp'}
                    danger
                    type="primary" 
                    onClick={deleteRange}
                    style={{width:"100%", marginTop:"3px"}} size={"small"} 
                  >
                    删除
                  </Button>

                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    onClick={copyData}
                    type="dashed" style={{width:"48%",marginRight:"6px", marginTop:"3px"}} size={"small"} 
                  >
                    复制
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='rangeOp'}
                    onClick={cutData}
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
                    onClick={curryingPointMove(1)}
                    type="dashed" style={{width:"48%", marginRight:"6px", marginTop:"3px"}} size={"small"} 
                  >
                    上移
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='pointOp'}
                    onClick={curryingPointMove(-1)}
                    type="dashed" style={{width:"48%", marginTop:"3px"}} size={"small"} 
                  >
                    下移
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='pointOp'}
                    onClick={deletePoint}
                    type="primary" style={{width:"48%", marginRight:"6px", marginTop:"3px"}} size={"small"} 
                  >
                    删除
                  </Button>
                  <Button
                    danger
                    disabled={editMode!='pointOp'}
                    onClick={pasteData}
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
                        onClick={handleOpenDialog}
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
                        onClick={resetData}
                        type="primary" icon={<ReloadOutlined />} style={{marginRight:"10px", width:"100px"}} size={"small"} 
                      >
                        重置数据
                  </Button>
                  <Button
                        type='button'
                        onClick={downloadData}
                        type="primary" icon={<DownloadOutlined />} style={{marginRight:"10px", width:"100px"}} size={"small"} 
                      >
                        下载数据
                  </Button>
                  <Button
                        type='button'
                        onClick={undo}
                        type="dashed" icon={<UndoOutlined />} style={{marginRight:"10px", width:"100px"}} size={"small"} 
                      >
                        回退操作
                  </Button>
                  单次平移步长：
                  <Select defaultValue="5" size="small" style={{ width: 120, height: 20 }}  onChange={handleChange}>
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