import ReactDOM from 'react-dom';
import React, { useEffect, useState } from "react";
import { Tree, Layout, Steps, Menu, Button, Tabs, Table, Tag, Space, Row, Col, Statistic, Card } from 'antd';
import { FileOutlined, PlusOutlined } from '@ant-design/icons';
import { CSVReader } from 'react-papaparse'
import ReactEcharts from 'echarts-for-react'

import 'antd/dist/antd.css';
import '../style/mainpage.css';

const { Header, Content, Sider, Footer } = Layout;
const buttonRef = React.createRef()
const { TabPane } = Tabs;

const ChartShop = () => {

  const [rootData, setRootData] = useState([]);                           //所有数据

  useEffect(() => {})

  const handleOpenDialog = (e) => {
    if (buttonRef.current) {
      buttonRef.current.open(e)
    }
  }

  const handleOnFileLoad = (data, f) => {//csv文件导入成功

  }

  const handleOnError = (err, file, inputElem, reason) => {
    alert(err);
  }

  const tabClick = (k) => {

  }

  return (
    <Layout>
      <Header className="header">
        <div className="logo" />
      </Header>
      <div className="main-page"> 
          <div className="side-content box-shadow"> 
            <CSVReader
              ref={buttonRef}
              onFileLoad={handleOnFileLoad}
              onError={handleOnError}
              noClick
              noDrag
            >
              {({ file }) => (
                  <Button
                    type='button'
                    onClick={handleOpenDialog}
                    type="primary" icon={<PlusOutlined />} style={{width:"100%"}} size={"small"} 
                  >
                  添加数据
                  </Button>
              )}
            </CSVReader>
            <br /><hr />
          </div>
          <div className="main-content box-shadow"> 
            <div style={{width:"100%", height:"100%"}}> 
            ff
            </div>
          </div>
        </div>

      <Footer style={{ textAlign: 'center' }}>Ant Design ©2020 Created by Qiyuxing </Footer>
    </Layout>
  );
};
export default ChartShop;
ReactDOM.render(<ChartShop />, document.getElementById("root"));