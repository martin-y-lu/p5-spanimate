import { Dispatch, SetStateAction, useEffect, useReducer, useRef, useState } from "react";
import { ColorData, EditorData, EditorDataEntry, EditorDataType, EditorDataValueColor, EditorDataValueInfo, EditorDataValueShape, EditorDataValueToggle, EditorDataValueVector2, EditorState, copyEditorValueInfo, editorDataTypeInfo } from "./editorState"
import Select from 'react-select'
import { Vector2, fixVec2 } from "../sketch/runtime";
import { Button } from "../ui/button";
import { text } from "stream/consumers";
import p5 from "p5";
import reactColor, {SketchPicker,CompactPicker} from "react-color"
import Switch from '@mui/material/Switch';
import { EditorDataCreationWidget } from "./editorDataCreationWidget";
import { ArrowToggle } from "./editorStateDisplay";

export function EditorDataEditWidget(props:{data:EditorDataEntry,forceUpdate:any}){
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
    if(valueInfo.type === EditorDataType.SHAPE){
        return <EditorShapeEditWidget valueInfo={valueInfo} forceUpdate={forceUpdate}/>
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

function componentToHex(c: number) {
    c= Math.round(c);
    if(c>255) c=255;
    if(c<0) c=0;
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function colorToHex(c: ColorData) {
    return "#" + componentToHex(c.r) + componentToHex(c.g) + componentToHex(c.b);
}

function EditorShapeEditWidget(props:{valueInfo:EditorDataValueShape,forceUpdate:any}){
    let {valueInfo,forceUpdate}= props;
    let [open,setOpen] = useState(false);

    const size = valueInfo.editSize;
    
    const editScale = valueInfo.editScale;
    const editOrigin = valueInfo.editOrigin;

    function spaceToScreen(value:Vector2,eOrigin:Vector2,eScale:number,size:number):Vector2{
        return new Vector2(size*((value.x - eOrigin.x)/eScale +1)/2  , size*((value.y- eOrigin.y)/eScale+1)/2); 
    }
    function screenToSpace(value:Vector2,eOrigin:Vector2,eScale:number,size:number):Vector2{
        return new Vector2((2*value.x/size -1)*eScale  + eOrigin.x, (2*value.y/size -1)*eScale + eOrigin.y); 
    }    
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const uiStateRef = useRef<{
            points: {[key:string]:{loc: Vector2 | null}}
            dragging: string | null, 
        }>({points:{origin:{loc: null},end:{loc:null} }, dragging: null})

    function drawPoints(context: CanvasRenderingContext2D, eScale:number,eOrigin:Vector2,points:{[key:string]:{loc: Vector2 }}){
        let uiState = uiStateRef.current;
        context.strokeStyle = '#000000'
        for(let key in points){
            const {loc} = points[key]
            if(key in uiState.points){
                uiState.points[key].loc = loc;
            }
            context.fillStyle = key === uiState.dragging ? '#999999': '#cccccc';
            const screenLoc =   spaceToScreen(loc,eOrigin,eScale,size) 
            context.beginPath();
            context.ellipse( screenLoc.x,screenLoc.y,5,5,0,0,Math.PI*2);
            context.stroke();
            context.fill();
            context.beginPath();
            context.moveTo(screenLoc.x-5,screenLoc.y)
            context.lineTo(screenLoc.x+5,screenLoc.y)
            context.moveTo(screenLoc.x,screenLoc.y-5)
            context.lineTo(screenLoc.x,screenLoc.y+5)
            context.stroke();
        }

    }
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
        
        let {value} = valueInfo;
        let origin = value.origin;
        let end = Vector2.add(origin,value.extent)

        if(value.fill){
            context.fillStyle = colorToHex(value.fill)
        }
        if(value.stroke){
            context.strokeStyle = colorToHex(value.stroke?.color)
            context.lineWidth = value.stroke.weight*size/(2*eScale)
        }
        const screenOrigin =spaceToScreen(origin,eOrigin,eScale,size)
        const screenEnd =spaceToScreen(end,eOrigin,eScale,size)
        context.beginPath();
        context.rect(screenOrigin.x,screenOrigin.y,screenEnd.x-screenOrigin.x,screenEnd.y-screenOrigin.y);
        if(value.fill){
            context.fill();
        }
        if(value.stroke){
            context.stroke();
        }

        drawPoints(context,eScale,eOrigin,{origin: {loc:origin}, end: {loc:end}})
    }
    useEffect(() => {
        drawCanvas();
    }, [canvasRef,open])
    
    function getMouseScreenPos(evt: MouseEvent): Vector2 | null {
        let rect = canvasRef?.current?.getBoundingClientRect();
        if(!rect) return null
        const mousePos = new Vector2(
          evt.clientX - rect.left,
          evt.clientY - rect.top
        )
        return mousePos
    }
    function handleMouseDown(evt:MouseEvent){
        const mousePos = getMouseScreenPos(evt);
        if(!mousePos) return
        // const mouseSpace = screenToSpace(mousePos,editOrigin,editScale,size);
        if(valueInfo == undefined) return null
        let uiState = uiStateRef.current;

        let minDist = size*100;
        let minKey = null;
        for(let key in uiState.points){
            let {loc} = uiState.points[key]
            if(!loc) continue
            let locScreen = spaceToScreen(loc,editOrigin,editScale,size);
            let dist = Vector2.dist(mousePos,locScreen)
            console.log({key,loc,mousePos,dist})
            if(dist<minDist){
                minDist = dist
                minKey =key
            }
        }
        console.log({minDist,minKey})
        if(minDist< 20){
            uiState.dragging = minKey
        }
    }
    function handleMouseMove(evt:MouseEvent)
    {
        const mousePos = getMouseScreenPos(evt);
        if(!mousePos) return
        const mouseSpace = screenToSpace(mousePos,editOrigin,editScale,size);
        if(valueInfo == undefined) return null

        let uiState = uiStateRef.current;
        if(uiState.dragging === "origin"){
            valueInfo.value.origin = mouseSpace;

            drawCanvas();
            forceUpdate();
        }
        if(uiState.dragging === "end"){
            if(! uiState.points.origin.loc) return 
            valueInfo.value.extent = new Vector2(mouseSpace.x- uiState.points.origin.loc.x,mouseSpace.y- uiState.points.origin.loc.y);

            drawCanvas();
            forceUpdate();
        }
        // }
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
                valueInfo.editOrigin =  new Vector2(0,0);
                drawCanvas( valueInfo.editScale,valueInfo.editOrigin)
                forceUpdate(); 
            }}/>
            </>}
            <ArrowToggle open={open} onClick={()=>setOpen(!open)} bgColor=" bg-slate-400 text-slate-50"/> 
        </div>
        {open&&<canvas 
            onMouseDown={handleMouseDown as any}
            onMouseUp={()=>{uiStateRef.current.dragging = null}}
            onMouseMove={handleMouseMove as any}
            
            ref={canvasRef} width={size} height={size}
        />}
    </div>
}