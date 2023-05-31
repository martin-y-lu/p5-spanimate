import { Dispatch, SetStateAction, useEffect, useReducer, useRef, useState } from "react";
import { ColorData, EditorData, EditorDataEntry, EditorDataType, EditorDataValueColor, EditorDataValueInfo, EditorDataValueToggle, EditorDataValueVector2, EditorState, copyEditorValueInfo, editorDataTypeInfo } from "./editorState"
import Select from 'react-select'
import { Vector2, fixVec2 } from "../sketch/runtime";
import { Button } from "../ui/button";
import { text } from "stream/consumers";
import p5 from "p5";
import reactColor, {SketchPicker,CompactPicker} from "react-color"
import Switch from '@mui/material/Switch';
import { EditorShape, EditorShapeType, editorShapeTypeInfo } from "./shape/types";



type EditorCreationData = EditorCreationAnyData | EditorCreationNumberData | EditorCreationVector2Data | EditorCreationColorData | EditorCreationToggleData | EditorCreationShapeData;

type EditorCreationAnyData = {
    type: EditorDataType.ANY,
    jsonInput: string, 
}
type EditorCreationNumberData = {
    type: EditorDataType.NUMBER,    
    valueInput: string,
    maxInput: string, 
    minInput: string,
    stepInput: string,
}
type EditorCreationVector2Data = {
    type: EditorDataType.VECTOR2,
    xInput: string,
    yInput: string, 
}
type EditorCreationColorData = {
    type: EditorDataType.COLOR,
    colorInput: ColorData,
}
type EditorCreationToggleData = {
    type: EditorDataType.TOGGLE,
    valueInput: boolean,
}
type EditorCreationShapeData = {
    type: EditorDataType.SHAPE,
    shapeType: EditorShapeType,
}

function defaultCreationData(type:EditorDataType): EditorCreationData {
    switch(type){
        case EditorDataType.ANY:
            return {type:type, jsonInput:""}
        case EditorDataType.NUMBER:
            return {type:type,valueInput:"1",maxInput:"10",minInput:"0",stepInput:"0.001"}
        case EditorDataType.VECTOR2:
            return {type:type, xInput:"0",yInput:"0"}
        case EditorDataType.COLOR:
            return {type:type, colorInput:{r:255,g:255,b:255,a:255}}
        case EditorDataType.TOGGLE:
            return {type:type, valueInput:false}   
        case EditorDataType.SHAPE:
            return {type:type, shapeType: EditorShapeType.RECT}   
    }
}

function makeFromCreationData(creationData:EditorCreationData): EditorDataValueInfo | null{
    switch(creationData.type){
        case EditorDataType.NUMBER:
            const value =  Number.parseFloat(creationData.valueInput)
            let min =  Number.parseFloat(creationData.minInput)
            let max =  Number.parseFloat(creationData.maxInput)
            let step=  Number.parseFloat(creationData.stepInput)
            if(!(isNumberSafe(value))) return null;
            if(!(isNumberSafe(step))) return null;
            if(!(isNumberSafe(max))){
                max = Math.max(value,0);
            }
            if(!(isNumberSafe(min))){
                min = Math.min(value,0);
            }
            // console.log("set number:" ,newKey,value, min ,max)
    
            return{ 
                type: EditorDataType.NUMBER,
                value,
                max: Math.max(min,max,value),
                min: Math.min(min,max,value),
                step: Math.max(step,0.001),
            }
        case  EditorDataType.VECTOR2:
            const x =  Number.parseFloat(creationData.xInput)
            const y =  Number.parseFloat(creationData.yInput)
            if(!(isNumberSafe(x)&&isNumberSafe(y))) return null;
            console.log("set vector:" ,x,y)
            return { 
                type: EditorDataType.VECTOR2,
                value: new Vector2(x,y),
                editOrigin: new Vector2(0,0),
                editScale: Math.max(x,-x,y,-y,1)*1.5,
            }
        case EditorDataType.COLOR:
            return {
                type: EditorDataType.COLOR,
                value: creationData.colorInput,
            }
        case EditorDataType.TOGGLE:
            return {
                type: EditorDataType.TOGGLE,
                value: creationData.valueInput,
            }
        case EditorDataType.ANY:{
                const value = creationData.jsonInput.length === 0 ? null : JSON.parse(creationData.jsonInput);
                // console.log("set value:" ,newKey,value)
                if(creationData.jsonInput.length !== 0){
                    if(typeof value === "number"){
                        const range = Math.max(1,-value,value);
                        return { 
                            type: EditorDataType.NUMBER,
                            value,
                            max: range,
                            min: -range,
                            step: 0.001,
                        }
                        console.log(value, " is a number")
                        // console.log(data.data[newKey]
                    }else{
                        return {
                            type: EditorDataType.ANY,
                            value
                        }
                    }
                }
                return null;
            }
        case EditorDataType.SHAPE:{
            let canvSize = new Vector2(500,500);
            return {
                type: EditorDataType.SHAPE,
                value: { 
                    rect: {
                        shape: makeDefaultShape(EditorShapeType.RECT),
                        z: 0,
                    }
                },
                editOrigin: new Vector2(canvSize.x/2,canvSize.y/2),
                editScale: canvSize.x/2,
                editSize: canvSize.x,
                widget:{
                    showMouse:false,
                }
            }
        }
        // case EditorDataType.SHAPE:
        //     return null;
    }
}

let editorDataTypeOptions :{value:EditorDataType,label:string}[] = []
for(let type of [EditorDataType.ANY,EditorDataType.NUMBER,EditorDataType.VECTOR2,EditorDataType.COLOR,EditorDataType.TOGGLE,EditorDataType.SHAPE]){
    editorDataTypeOptions.push({
        value: type,
        label: editorDataTypeInfo[type].prettyName,
    })
}

export function EditorDataCreationWidget( props: {data:EditorDataEntry,bgColor:string,notBgColor:string, forceUpdate:any, newKey:string,setNewKey:Dispatch<SetStateAction<string>> }){
    let {data,bgColor,notBgColor,forceUpdate,newKey,setNewKey} = props;

    // let [newValue,setNewValue] = useState<{v1:string,v2:string,v3:string,color:ColorData}>({v1:"",v2:"",v3:"",color: {r:255,g:255,b:255,a:255}})
    let [creationData, setCreationData] = useState<EditorCreationData>({type:EditorDataType.ANY, jsonInput:""})
    // const [selectedType, setSelectedType] = useState(EditorDataType.ANY);
    

    return <div  className= {`flex flex-row ${bgColor} align-middle  pl-3 mt-2 mb-2 `}>
           
    <div className={`flex justify-center w-8 hover:${notBgColor}`} onClick= {()=>{
        // console.log("clicked",selectedType,newValue)
        if(newKey === "") return
        try{
            if( ! data.data){
                data.data = {}
            }
            if(! (newKey in data.data)){
                data.data[newKey] = {}
            }

            let newVal = makeFromCreationData(creationData);
            if(!newVal) return
            data.data[newKey].valueInfo = newVal;
            setCreationData(defaultCreationData(creationData.type))
            // setNewValue({v1:"",v2:"",v3:"",color:{r:255,g:255,b:255,a:255}})
            forceUpdate();
            return;
        }catch(e){
            console.log("err",e)
        }
    }}>
        +
    </div>
  
    <input type="text" name="key" placeholder="key" autoComplete="off" className="w-2/12 h-9 pl-1 mr-1" value = {newKey} onChange = {(ch)=>{setNewKey(removeTrailingWhiteSpace(ch.target.value))}}/>
    <div className=" text-xs mr-2">
        <Select options={editorDataTypeOptions} defaultValue={{value:EditorDataType.ANY as string,label:"Any"}} onChange={(selected)=>{
            let selectedType = (selected?.value ?? EditorDataType.ANY) as EditorDataType;
            if(selectedType == creationData.type) return
            setCreationData(defaultCreationData(selectedType))
        }}/>
    </div>
    {"  : "} 
    <EditorDataCreation data={creationData} setData={setCreationData}/>
    
    { (data?.data && newKey in data.data) && <div className={`flex justify-center w-8 hover:${notBgColor}`} onClick= {()=>{
        delete data?.data?.[newKey]
        forceUpdate();
    }}>
        x
    </div>}
    
</div>  
}
function EditorDataCreation(props:{data:EditorCreationData,setData:Dispatch<SetStateAction<EditorCreationData>>}):JSX.Element{
    let {data,setData} = props;
    switch(data.type){
        case EditorDataType.ANY:
        return <EditorDataCreationAny data ={data} setData={setData}/>
        case EditorDataType.NUMBER:
        return <EditorDataCreationNumber data ={data} setData={setData}/>
        case EditorDataType.VECTOR2:
        return <EditorDataCreationVector2 data ={data} setData={setData}/>
        case EditorDataType.COLOR:
        return <EditorDataCreationColor data ={data} setData={setData}/>
        case EditorDataType.TOGGLE:
            return <EditorDataCreationToggle data ={data} setData={setData}/>
        case EditorDataType.SHAPE:
            return <EditorDataCreationShape data={data} setData={setData}/>
    }
}

function EditorDataCreationAny(props: {data:EditorCreationAnyData,setData:Dispatch<SetStateAction<EditorCreationData>>}){
    let {data,setData} = props;
    return <input type="text" name="data" placeholder="json" autoComplete="off" className="w-1/3 pl-1 ml-3" value = {data.jsonInput} onChange = {(ch)=>{setData({type: EditorDataType.ANY,jsonInput:ch.target.value })}}/>
}
function EditorDataCreationNumber(props: {data:EditorCreationNumberData,setData:Dispatch<SetStateAction<EditorCreationData>>}){
    let {data,setData} = props;
    return <>
        <input type="text" name="data" placeholder="min" autoComplete="off" className="w-1/12 pl-1 ml-3" value = {data.minInput ?? ""} onChange = {(ch)=>{setData({...data,minInput:ch.target.value})}}/>
        <input type="text" name="data" placeholder="value" autoComplete="off" className="w-3/12 pl-1 ml-3" value = {data.valueInput ?? ""} onChange = {(ch)=>{setData({...data,valueInput:ch.target.value})}}/>
        <input type="text" name="data" placeholder="max" autoComplete="off" className="w-1/12 pl-1 ml-3" value = {data.maxInput ?? ""}  onChange = {(ch)=>{setData({...data,maxInput:ch.target.value})}}/>
        <input type="text" name="data" placeholder="step" autoComplete="off" className="w-1/12 pl-1 ml-3" value = {data.stepInput ?? ""}  onChange = {(ch)=>{setData({...data,stepInput:ch.target.value})}}/>
    </>
}
function EditorDataCreationVector2(props: {data:EditorCreationVector2Data,setData:Dispatch<SetStateAction<EditorCreationData>>}){
    let {data,setData} = props;
    return  <>
    <input type="text" name="data" placeholder="x" autoComplete="off" className="w-1/4 pl-1 ml-3" value = {data.xInput ?? ""} onChange = {(ch)=>{setData({...data,xInput:ch.target.value})}}/>
    <input type="text" name="data" placeholder="y" autoComplete="off" className="w-1/4 pl-1 ml-3" value = {data.yInput ?? ""} onChange = {(ch)=>{setData({...data,yInput:ch.target.value})}}/>
   </>
}
function EditorDataCreationColor(props: {data:EditorCreationColorData,setData:Dispatch<SetStateAction<EditorCreationData>>}){
    let {data,setData} = props;
    return <>
    <div className ="pl-1 ml-3 mb-3">
    <CompactPicker
        color={data.colorInput}
        onChange={(colRes)=>{
            setData({...data, colorInput: {... colRes.rgb, a:(colRes.rgb?.a ?? 1)*255}})
        }}
        />
    </div>
</>
}
function EditorDataCreationToggle(props: {data:EditorCreationToggleData,setData:Dispatch<SetStateAction<EditorCreationData>>}){
    let {data,setData} = props;
    return  <>
    <Switch checked={data.valueInput} onChange={(event)=>{
        setData({...data, valueInput: event.target.checked})
    }}/>
</>
}

export let editorShapeTypeOptions :{value:EditorShapeType,label:string}[] = []
for(let type of [EditorShapeType.RECT]){
    editorShapeTypeOptions.push({
        value: type,
        label: editorShapeTypeInfo[type].prettyName,
    })
}
function EditorDataCreationShape(props: {data:EditorCreationShapeData,setData:Dispatch<SetStateAction<EditorCreationData>>}){
    let {data,setData} = props;
    return  <>
         <div className="ml-3 text-xs mr-2">

          <Select options={editorShapeTypeOptions} defaultValue={{value:EditorShapeType.RECT as string,label:"Rect"}} onChange={(selected)=>{
              let selectedType = (selected?.value ?? EditorShapeType.RECT) as EditorShapeType;
              if(selectedType == data.shapeType) return   
              setData({...data, valueInput: selectedType})
            }}/>
        </div>
</>
}


function isNumberSafe(num:number): boolean{
    return Number.isFinite(num) && ! Number.isNaN(num);
}
function removeTrailingWhiteSpace(str:string): string { 
    return str.trim();
}

export function makeDefaultShape(shape: EditorShapeType): EditorShape {
    switch(shape){
        case EditorShapeType.RECT:
            return {
                type: EditorShapeType.RECT,
                origin: new Vector2(0,0),
                extent: new Vector2(100,100),
                fill: {r:255,g:0,b:0,a:255},
            }
    }
}
