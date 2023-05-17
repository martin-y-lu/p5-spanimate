import { Dispatch, SetStateAction, useEffect, useReducer, useRef, useState } from "react";
import { ColorData, EditorData, EditorDataEntry, EditorDataType, EditorDataValueColor, EditorDataValueInfo, EditorDataValueToggle, EditorDataValueVector2, EditorState, copyEditorValueInfo, editorDataTypeInfo } from "./editorState"
import Select from 'react-select'
import { Vector2, fixVec2 } from "../sketch/runtime";
import { Button } from "../ui/button";
import { text } from "stream/consumers";
import p5 from "p5";
import reactColor, {SketchPicker,CompactPicker} from "react-color"
import Switch from '@mui/material/Switch';

export type EditorStateDisplayProps = {
    editorData: EditorData,
    depth?: number,
    setNewKey?:Dispatch<SetStateAction<string>>
}

function EditorDataEditWidget(props:{data:EditorDataEntry,forceUpdate:any}){
    let {data,forceUpdate}= props;
    if(data?.valueInfo == undefined) return <></>;
    let valueInfo = data?.valueInfo;
    if(valueInfo.type === EditorDataType.NUMBER)
        return <input type="range" min = {valueInfo.min} max = {valueInfo.max} step={valueInfo.step} className="ml-5 mr-3" value={data?.valueInfo.value} onChange={(ch)=>{
                if(data?.valueInfo == undefined) return    
                data.valueInfo.value = ch.target.valueAsNumber;
                forceUpdate();
            }}/>
    if(valueInfo.type === EditorDataType.VECTOR2){
        return <EditorVector2EditWidget valueInfo={valueInfo} forceUpdate={forceUpdate}/>
    }
    if(valueInfo.type === EditorDataType.COLOR){
        return <EditorColorEditWidget valueInfo={valueInfo} forceUpdate={forceUpdate}/>
    }
    if(valueInfo.type === EditorDataType.TOGGLE){
        return <EditorToggleEditWidget valueInfo={valueInfo} forceUpdate={forceUpdate}/>
    }
    return <></>
}

function EditorToggleEditWidget(props:{valueInfo: EditorDataValueToggle,forceUpdate:any}){
    let {valueInfo,forceUpdate}= props;
    return     <Switch checked={(valueInfo.value)} onChange={(event)=>{
         valueInfo.value =  event.target.checked;
         forceUpdate();
    }}/>
}
function colorDataToPickerColor(color:ColorData): reactColor.RGBColor{
    return {...color, a: color.a/255}
}
function pickerColorToColorData(color: reactColor.RGBColor): ColorData{
    return {...color, a: (color?.a ?? 1)*255}
}
function EditorColorEditWidget(props:{valueInfo:EditorDataValueColor,forceUpdate:any}){
    let {valueInfo,forceUpdate}= props;
    let [open,setOpen] = useState(false);
    return <div className="flex flex-col bg-slate-50 justify-end items-end">
    <div className="flex flex-row">
        
        <ArrowToggle open={open} onClick={()=>setOpen(!open)} bgColor=" bg-slate-400 text-slate-50"/> 
    </div>
    {open&&<>
            <SketchPicker color={colorDataToPickerColor(valueInfo.value)} onChange={(colRes)=>{
                valueInfo.value = pickerColorToColorData(colRes.rgb)
                forceUpdate()
            }}/>
        </>
        }  
    </div>

}
function EditorVector2EditWidget(props:{valueInfo:EditorDataValueVector2,forceUpdate:any}){
    let {valueInfo,forceUpdate}= props;
    let [open,setOpen] = useState(false);

    const size = 200;
    
    const editScale = valueInfo.editScale;
    const editOrigin = valueInfo.editOrigin;

    let mouseDownRef = useRef(false);
    
    const canvasRef = useRef<HTMLCanvasElement>(null)
    function drawCanvas(eScale?:number,eOrigin?:Vector2){
        eScale ??= editScale
        eOrigin ??= editOrigin

        const canvas = canvasRef.current
        if(!canvas) return 
        const context = canvas.getContext('2d')
        if(!context) return
        //Our first draw
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, context.canvas.width, context.canvas.height)
        
        context.strokeStyle = '#000000'
        context.fillStyle = '#aaaaaa'
        context.beginPath();
        let value = valueInfo?.value as Vector2;
        context.ellipse( size*((value.x - eOrigin.x)/eScale +1)/2  , size*((value.y- eOrigin.y)/eScale+1)/2,5,5,0,0,6);
        // context.ellipse(0,0,10,10,0,0,6);
        context.stroke();
        context.fill();
    }
    useEffect(() => {
        drawCanvas();
    }, [canvasRef,open])
    

    function handleMouseMove(evt:MouseEvent)
    {
        let rect = canvasRef?.current?.getBoundingClientRect();
        if(!rect) return 
        const mousePos = {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
        if(mouseDownRef.current){
            // console.log(mousePos)
            if(valueInfo == undefined) return
            valueInfo.value = new Vector2((2*mousePos.x/size -1)*editScale  + editOrigin.x, (2*mousePos.y/size -1)*editScale + editOrigin.y )
            drawCanvas();
            forceUpdate();
        }
    }
    return <div className="flex flex-col bg-slate-50 justify-end items-end">
        <div className="flex flex-row">
            {open&&<>
            <div className="ml-1 mr-1">
                {editScale.toPrecision(3)}
            </div>
            <Button text="+" onClick={()=>{
                valueInfo.editScale *= 0.5;
                let vec = fixVec2(valueInfo.value);
                if(vec){
                    valueInfo.editOrigin = vec;
                }
                drawCanvas( valueInfo.editScale,valueInfo.editOrigin)
                forceUpdate();
            }}/>
            <Button text="-" onClick={()=>{
                    valueInfo.editScale *= 2;
                    drawCanvas( valueInfo.editScale)
                    forceUpdate();
                }}/>
            <Button text="rs" onClick={()=>{
                valueInfo.editScale = 1;
                valueInfo.editOrigin = new Vector2(0,0);
                drawCanvas( valueInfo.editScale,valueInfo.editOrigin)
                forceUpdate(); 
            }}/>
            <Button text="c" onClick={()=>{
                valueInfo.editOrigin = fixVec2(valueInfo.value) ?? new Vector2(0,0);
                drawCanvas( valueInfo.editScale,valueInfo.editOrigin)
                forceUpdate(); 
            }}/>
            </>}
            <ArrowToggle open={open} onClick={()=>setOpen(!open)} bgColor=" bg-slate-400 text-slate-50"/> 
        </div>
        {open&&<canvas 
            onMouseDown={()=>{mouseDownRef.current = true}}
            onMouseUp={()=>{mouseDownRef.current = false}}
            onMouseMove={handleMouseMove as any} ref={canvasRef} width={size} height={size}
        />}
    </div>
}

let editorDataTypeOptions :{value:EditorDataType,label:string}[] = []
for(let type of [EditorDataType.ANY,EditorDataType.NUMBER,EditorDataType.VECTOR2,EditorDataType.COLOR,EditorDataType.TOGGLE]){
    editorDataTypeOptions.push({
        value: type,
        label: editorDataTypeInfo[type].prettyName,
    })
}

function isNumberSafe(num:number): boolean{
    return Number.isFinite(num) && ! Number.isNaN(num);
}
export function ArrowToggle(props:{open:boolean,onClick:any,bgColor:string}){
    const {open,onClick,bgColor} = props;
    return  <div onClick={onClick} className={` ${bgColor} rounded-lg mr-2 w-4 flex flex-row justify-center align-middle`}>
        {open?"v":">"}
    </div>
}

function isDataArray(data: EditorDataEntry):boolean{
    if(! data?.data) return false;
    let keys = Object.keys(data?.data);
    if(keys.length < 1) return false;
    for(let key of keys){
        const asNum = Number.parseInt(key);
        if(Number.isNaN(asNum)) return false;
    }
    return true;
}

function EditorValueDisplay(props:{data:EditorDataEntry}){
    let {data} = props;
    if( ! data?.valueInfo) return <></>
    if( data.valueInfo.type == EditorDataType.COLOR){
        let col = data.valueInfo.value;
        return<div className= "flex flex-row">
            {/* Color: */}
            <div className = "w-5 h-5 ml-3 border-slate-500 border rounded-sm" style={{background: `rgba(${col.r},${col.g},${col.b},${col.a/255})`}}></div>
        </div>
    }

    let textDisplay = "";
    if(typeof data.valueInfo?.value === "object" && "prettyString" in data.valueInfo?.value){
        textDisplay = data.valueInfo?.value.prettyString();
    } else{
        textDisplay=JSON.stringify(data.valueInfo?.value)
    }
    return <div> 
        {textDisplay} 
    </div>
}
export function EditorDataCreationWidget( props: {data:EditorDataEntry,bgColor:string,notBgColor:string, forceUpdate:any, newKey:string,setNewKey:Dispatch<SetStateAction<string>> }){
    let {data,bgColor,notBgColor,forceUpdate,newKey,setNewKey} = props;

    let [newValue,setNewValue] = useState<{v1:string,v2:string,v3:string,color:ColorData}>({v1:"",v2:"",v3:"",color: {r:255,g:255,b:255,a:255}})
    const [selectedType, setSelectedType] = useState(EditorDataType.ANY);

    return <div  className= {`flex flex-row ${bgColor} align-middle  pl-3 mt-2 mb-2 `}>
           
    <div className={`flex justify-center w-8 hover:${notBgColor}`} onClick= {()=>{
        console.log("clicked",selectedType,newValue)
        try{
            if( ! data.data){
                data.data = {}
            }
            if(! (newKey in data.data)){
                data.data[newKey] = {}
            }
            if(selectedType === EditorDataType.NUMBER){
                const value =  Number.parseFloat(newValue.v1)
                const min =  Number.parseFloat(newValue.v2)
                const max =  Number.parseFloat(newValue.v3)
                if(!(isNumberSafe(value)&&isNumberSafe(min)&&isNumberSafe(max))) return;
                console.log("set number:" ,newKey,value, min ,max)
           
                data.data[newKey].valueInfo = { 
                    type: EditorDataType.NUMBER,
                    value,
                    max: Math.max(min,max,value),
                    min: Math.min(min,max,value),
                    step: 0.001,
                }
            }else if(selectedType === EditorDataType.VECTOR2){
                const x =  Number.parseFloat(newValue.v1)
                const y =  Number.parseFloat(newValue.v2)
                if(!(isNumberSafe(x)&&isNumberSafe(y))) return;
                console.log("set vector:" ,x,y)
                data.data[newKey].valueInfo = { 
                    type: EditorDataType.VECTOR2,
                    value: new Vector2(x,y),
                    editOrigin: new Vector2(0,0),
                    editScale: 1.0,
                }
            }else if(selectedType === EditorDataType.COLOR){
                data.data[newKey].valueInfo = {
                    type: EditorDataType.COLOR,
                    value: newValue.color,
                }
            }else if(selectedType === EditorDataType.TOGGLE){
                data.data[newKey].valueInfo = {
                    type: EditorDataType.TOGGLE,
                    value: newValue.v1 === "true",
                }
            }else{
                const value = newValue.v1.length === 0 ? null : JSON.parse(newValue.v1);
                console.log("set value:" ,newKey,value)
                if(newValue.v1.length !== 0){
                    if(typeof value === "number"){
                        const range = Math.max(1,-value,value);
                        data.data[newKey].valueInfo = { 
                            type: EditorDataType.NUMBER,
                            value,
                            max: range,
                            min: -range,
                            step: 0.001,
                        }
                        console.log(value, " is a number")
                        console.log(data.data[newKey])
                    }else{
                        data.data[newKey].valueInfo = {
                            type: EditorDataType.ANY,
                            value
                        }
                    }
                }
            }
            setNewValue({v1:"",v2:"",v3:"",color:{r:255,g:255,b:255,a:255}})
            forceUpdate();
            return;
        }catch(e){
            console.log("err",e)
        }
    }}>
        +
    </div>
  
    <input type="text" name="key" placeholder="key" autoComplete="off" className="w-2/12 h-9 pl-1 mr-1" value = {newKey} onChange = {(ch)=>{setNewKey(ch.target.value)}}/>
    <div className=" text-xs mr-2">
        <Select options={editorDataTypeOptions} defaultValue={{value:EditorDataType.ANY as string,label:"Any"}} onChange={(selected)=>{
            let selectedType = (selected?.value ?? EditorDataType.ANY) as EditorDataType;
            setSelectedType(selectedType);
            if(selected?.value === EditorDataType.NUMBER){
                let curNum = Number.parseFloat(newValue?.v1.toString() ?? "");
                if(! isNaN(curNum)){
                    let range = Math.min(Math.max(1,curNum,-curNum),10000);
                    setNewValue({...newValue, v3:range.toString(),v2:(-range).toString() })
                }else{
                    setNewValue({...newValue, v3:"1",v2:"-1" })
                }
            }
        }}/>
    </div>
    {"  : "} 
    {
        ( selectedType === EditorDataType.ANY ) ? <input type="text" name="data" placeholder="json" autoComplete="off" className="w-1/3 pl-1 ml-3" value = {newValue?.v1} onChange = {(ch)=>{setNewValue({... newValue, v1: ch.target.value})}}/>
        : ( selectedType === EditorDataType.NUMBER ) ? <>
            <input type="text" name="data" placeholder="min" autoComplete="off" className="w-1/12 pl-1 ml-3" value = {newValue?.v2 ?? ""} onChange = {(ch)=>{setNewValue({... newValue, v2: ch.target.value})}}/>
            <input type="text" name="data" placeholder="value" autoComplete="off" className="w-1/3 pl-1 ml-3" value = {newValue?.v1 ?? ""} onChange = {(ch)=>{setNewValue({... newValue, v1: ch.target.value})}}/>
            <input type="text" name="data" placeholder="max" autoComplete="off" className="w-1/12 pl-1 ml-3" value = {newValue?.v3 ?? ""}  onChange = {(ch)=>{setNewValue({... newValue, v3: ch.target.value})}}/>
        </> :
         ( selectedType === EditorDataType.VECTOR2 ) ? <>
         <input type="text" name="data" placeholder="x" autoComplete="off" className="w-1/4 pl-1 ml-3" value = {newValue?.v1 ?? ""} onChange = {(ch)=>{setNewValue({... newValue, v1: ch.target.value})}}/>
         <input type="text" name="data" placeholder="y" autoComplete="off" className="w-1/4 pl-1 ml-3" value = {newValue?.v2 ?? ""} onChange = {(ch)=>{setNewValue({... newValue, v2: ch.target.value})}}/>
        </> :
         ( selectedType === EditorDataType.COLOR ) ? <>
            <div className ="pl-1 ml-3 mb-3">
            <CompactPicker
                color={newValue?.color}
                onChange={(colRes)=>{
                    setNewValue({...newValue, color: {... colRes.rgb, a:(colRes.rgb?.a ?? 1)*255}})
                }}
                />
            </div>
        </> :  
         ( selectedType === EditorDataType.TOGGLE ) ? <>
            <Switch checked={(newValue?.v1 === "true")} onChange={(event)=>{
                setNewValue({...newValue, v1:event.target.checked ? "true": "false"})
                }}/>
        </> :  
        <></>
    }
    
    { (data?.data && newKey in data.data) && <div className={`flex justify-center w-8 hover:${notBgColor}`} onClick= {()=>{
        delete data?.data?.[newKey]
        forceUpdate();
    }}>
        x
    </div>}
    
</div>  
}
export function EditorDisplayEntry(props:{editorData:EditorData,ind:string,depth:number, setNewKey?: Dispatch<SetStateAction<string>>}){
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    
    let {editorData,ind,depth,setNewKey:parentSetNewKey} = props;
    let data = editorData[ind];
    let [open,setOpen] = useState("data" in data || ! ("valueInfo" in data));
    let [newKey,setNewKey] = useState("")

    let subDat = (data  && data.data ) ? <EditorStateDisplay editorData={data.data} depth={depth+1} setNewKey={setNewKey}/> : <></>
    const bgColor= depth%2 == 0 ?'bg-slate-200' : 'bg-slate-100';
    const notBgColor= depth%2 == 0 ? 'bg-slate-100' :'bg-slate-200';

    let dataIsArray = isDataArray(data);
    let childCount = Object.keys(data.data ?? {}).length;
  

  return <div key={ind} className= {`${bgColor} pl-3 mt-2 border-l-2 border-slate-400`}>
    <div className="flex flex-row justify-between">
        <div className="flex flex-row items-center w-2/3" >
        <ArrowToggle open={open} onClick={()=>setOpen(!open)} bgColor={notBgColor}/>
        <div className="mr-2" onClick={()=>{
            if(parentSetNewKey){
                parentSetNewKey(ind);
            }
        }}>
            {ind}
            {
                dataIsArray && `[${childCount}]`
            }
            :
        </div>
        <EditorValueDisplay data={data}/> 
        {data?.valueInfo !== undefined && (dataIsArray || childCount === 0) && <Button style= "text-xs h-5 bg-slate-50 ml-6" text="Copy >" onClick={()=>{
            if(data.valueInfo === undefined) return 
            if( ! data.data){
                data.data = {}
            }
            let ind = Object.keys(data.data).length;
            while(ind in data.data){
                ind += 1;
            }
            data.data[ind] = {valueInfo: copyEditorValueInfo(data.valueInfo)}
            // setOpen(true);
            forceUpdate();

        }}/>}
        </div>
        <div className="flex flex-row">
            
            <EditorDataEditWidget data={data} forceUpdate={forceUpdate}/>
        </div>
    </div>
    {open && <>
        {subDat}
        <EditorDataCreationWidget {...{data,bgColor,notBgColor,forceUpdate,newKey,setNewKey}}/>
    </>}
  </div>  
}

export function EditorStateDisplay(props: EditorStateDisplayProps){
    let {editorData,depth,setNewKey} = props;
    const _depth = depth !== undefined ? depth : 0;
    
    return <div className="flex flex-col pl-2 pb-1" >
        { editorData && Object.keys(editorData).map((key)=>{
            return <EditorDisplayEntry editorData={editorData} key={key} ind = {key} depth={_depth} setNewKey={ setNewKey}/>
        })
        }
       
    </div>
}