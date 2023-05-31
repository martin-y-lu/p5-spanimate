import { Dispatch, SetStateAction, useEffect, useReducer, useRef, useState } from "react";
import { ColorData, EditorData, EditorDataEntry, EditorDataType, EditorDataValueColor, EditorDataValueInfo, EditorDataValueShape, EditorDataValueToggle, EditorDataValueVector2, EditorShapes, EditorShapesEntry, EditorState, Indexor, copyEditorValueInfo, editorDataTypeInfo } from "./editorState"
import Select, { useStateManager } from 'react-select'
import { Vector2, fixVec2 } from "../sketch/runtime";
import { Button } from "../ui/button";
import { text } from "stream/consumers";
import p5 from "p5";
import reactColor, {SketchPicker,CompactPicker} from "react-color"
import Switch from '@mui/material/Switch';
import { EditorDataCreationWidget, editorShapeTypeOptions, makeDefaultShape } from "./editorDataCreationWidget";
import { ArrowToggle } from "./editorStateDisplay";
import { EditorShapeRect, EditorShapeType } from "./shape/types";

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
    return "#" + componentToHex(c.r) + componentToHex(c.g) + componentToHex(c.b)+ componentToHex(c.a);
}

function EditorShapeEditWidget(props:{valueInfo:EditorDataValueShape,forceUpdate:any}){
    let {valueInfo,forceUpdate}= props;
    let {value} = valueInfo;
    let [open,setOpen] = useState(false);
    let [selectedShapeType,setSelectedShapeType] = useState(EditorShapeType.RECT);

    function spaceToScreen(value:Vector2,eOrigin:Vector2,eScale:number,size:number):Vector2{
        return new Vector2(size*((value.x - eOrigin.x)/eScale +1)/2  , size*((value.y- eOrigin.y)/eScale+1)/2); 
    }
    function screenToSpace(value:Vector2,eOrigin:Vector2,eScale:number,size:number):Vector2{
        return new Vector2((2*value.x/size -1)*eScale  + eOrigin.x, (2*value.y/size -1)*eScale + eOrigin.y); 
    }    
    const canvasRef = useRef<HTMLCanvasElement>(null)
    type UiState = {
        selectedShapeKey: string | null,
        points: {[key:string]:{loc: Vector2 | null, show: boolean}}
        dragging: string | null, 
    }
    const uiStateRef = useRef<UiState>({selectedShapeKey:"rect",points:{origin:{loc: null,show:true},end:{loc:null,show:true} }, dragging: null})

    function drawPoints(context: CanvasRenderingContext2D, valueInfo: EditorDataValueShape ,points:{[key:string]:{loc: Vector2 }}){
        const eScale = valueInfo.editScale;
        const eOrigin = valueInfo.editOrigin;
        const size = valueInfo.editSize;


        let uiState = uiStateRef.current;
        context.strokeStyle = '#000000'
        for(let key in points){
            const {loc} = points[key]
            if(key in uiState.points){
                uiState.points[key].loc = loc;
            }
            context.fillStyle = key === uiState.dragging ? '#aaaaaa': '#eeeeee';
            context.strokeStyle ='#000000';
            context.lineWidth = 2;
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
    function drawCanvas(valueInfo: EditorDataValueShape, uiState: UiState){
        const eScale = valueInfo.editScale;
        const eOrigin = valueInfo.editOrigin;
        const size = valueInfo.editSize;
        // const uiState = uiStateRef.current;
        

        const canvas = canvasRef.current
        if(!canvas) return 
        const context = canvas.getContext('2d')
        if(!context) return
        //Our first draw
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, context.canvas.width, context.canvas.height)
        
        let kv : {key:Indexor,z:number}[] = Object.keys(valueInfo.value).map(key=>{return{key,z:valueInfo.value[key].z}}).sort((a,b)=>a.z -b.z)

        for(let el of kv){
            let key = el.key;
            let value = valueInfo.value[key].shape;
            
            let origin = value.origin;
            let end = Vector2.add(origin,value.extent)
            
            if(value.fill){
                context.fillStyle = colorToHex(value.fill)
            }else{
                context.fillStyle = ""
            }
            let showStroke = true;
            if(value.stroke){
                context.strokeStyle = colorToHex(value.stroke?.color)
                context.lineWidth = value.stroke.weight*size/(2*eScale)
                if(value.stroke.weight <= 0.001){
                    context.strokeStyle = "" 
                    showStroke = false;
                } 
            }else{
                context.strokeStyle = ""
                showStroke = false;
            }
            const screenOrigin =spaceToScreen(origin,eOrigin,eScale,size)
            const screenEnd =spaceToScreen(end,eOrigin,eScale,size)
            // context.beginPath();
            context.fillRect(screenOrigin.x,screenOrigin.y,screenEnd.x-screenOrigin.x,screenEnd.y-screenOrigin.y);
            if(value.fill){
                context.fill();
            }
            if(showStroke){
                context.strokeRect(screenOrigin.x,screenOrigin.y,screenEnd.x-screenOrigin.x,screenEnd.y-screenOrigin.y);
            }
            
            if(el.key === uiState.selectedShapeKey){
                drawPoints(context,valueInfo,{origin: {loc:origin}, end: {loc:end}})
            }
        }

        // draw points
        {
            let key = uiState.selectedShapeKey;
            console.log("selected key:",key)
            if(key !== null){   
                let value = valueInfo.value?.[key]?.shape;
                if(value === null) return;
                
                let origin = value.origin;
                let end = Vector2.add(origin,value.extent)
                
                drawPoints(context,valueInfo,{origin: {loc:origin}, end: {loc:end}})
            }
        }
    }
    function redrawCanvas(){
        drawCanvas(valueInfo,uiStateRef.current);
    }
    function deleteKey(key:string){ 
        if(uiStateRef.current.selectedShapeKey === key) {
            uiStateRef.current.selectedShapeKey = null;
        }
        delete valueInfo.value[key];
        drawCanvas(valueInfo,uiStateRef.current); 
        forceUpdate();
    }
    useEffect(() => {
        drawCanvas(valueInfo,uiStateRef.current);
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

    function initUIStatePoints(type: EditorShapeType) {
        switch(type){
            case EditorShapeType.RECT: {
                uiStateRef.current.points = {origin:{loc: null,show:true},end:{loc:null,show:true} };
            }
        }
        // throw new Error("Function not implemented.");
    }
    
    const editScale = valueInfo.editScale;
    const editOrigin = valueInfo.editOrigin;
    const size = valueInfo.editSize;

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
            // console.log({key,loc,mousePos,dist})
            if(dist<minDist){
                minDist = dist
                minKey =key
            }
        }
        console.log({minDist,minKey})
        if(minDist< 20){
            uiState.dragging = minKey
            return 
        }

        const mouseSpace = screenToSpace(mousePos,editOrigin,editScale,size);
        // check click other shapes
        //  "rect2"
        for(const key in valueInfo.value){
            const shapeEntry = valueInfo.value[key]
            if( vectorInShape(mouseSpace,shapeEntry.shape,{tolerance: 20/size}) ){
                uiState.selectedShapeKey = key;
                initUIStatePoints(shapeEntry.shape.type)
                redrawCanvas();
                forceUpdate();
                return;
            }
        }
        uiState.selectedShapeKey = null;
        redrawCanvas();
        forceUpdate();
    }
    const selectedShape = uiStateRef.current.selectedShapeKey === null ? null : valueInfo.value[uiStateRef.current.selectedShapeKey];
    function handleMouseMove(evt:MouseEvent)
    {
        const mousePos = getMouseScreenPos(evt);
        if(!mousePos) return
        const mouseSpace = screenToSpace(mousePos,editOrigin,editScale,size);
        if(valueInfo == undefined) return null

        let uiState = uiStateRef.current;

        if(selectedShape === null) return null;
        if(selectedShape.shape.type === EditorShapeType.RECT){
            if(uiState.dragging === "origin"){
                selectedShape.shape.origin = mouseSpace;
                redrawCanvas();
                forceUpdate();
            }
            if(uiState.dragging === "end"){
                if(! uiState.points.origin.loc) return 
                selectedShape.shape.extent = new Vector2(mouseSpace.x- uiState.points.origin.loc.x,mouseSpace.y- uiState.points.origin.loc.y);
                redrawCanvas();
                forceUpdate();
            }
            // }
        }
    }
    function addDefaultShape(selectedType: EditorShapeType): string {
        switch(selectedType){
            case EditorShapeType.RECT:{
                const defaultShape = makeDefaultShape(selectedType);
                let number = 1;
                while(`rect${number}` in valueInfo.value){
                    number += 1;
                }
                let key = `rect${number}`;
                valueInfo.value[key]= {shape:defaultShape,z: number}
                return key;
             }
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
                redrawCanvas();
                forceUpdate();
            }}/>
            <Button text="-" onClick={()=>{
                    valueInfo.editScale *= 2;
                    redrawCanvas();
                    forceUpdate();
                }}/>
            <Button text="rs" onClick={()=>{
                valueInfo.editScale = 1;
                valueInfo.editOrigin = new Vector2(0,0);
                redrawCanvas();
                forceUpdate(); 
            }}/>
            <Button text="c" onClick={()=>{
                valueInfo.editOrigin =  new Vector2(size/2,size/2);
                redrawCanvas();
                forceUpdate(); 
            }}/>
            </>}
            <ArrowToggle open={open} onClick={()=>setOpen(!open)} bgColor=" bg-slate-400 text-slate-50"/> 
        </div>
        {open&&<>
            <canvas 
                onMouseDown={handleMouseDown as any}
                onMouseUp={()=>{uiStateRef.current.dragging = null}}
                onMouseMove={handleMouseMove as any}
                
                ref={canvasRef} width={size} height={size}
                /> 
                 <div className = "flex flex-row justify-end mt-3 mb-3">
                    <Button text = "Add shape" onClick={()=>{
                        let createdKey : string = addDefaultShape(selectedShapeType);
                        uiStateRef.current.selectedShapeKey = createdKey;
                        drawCanvas( valueInfo,uiStateRef.current)
                        forceUpdate(); 
                    }}/>
                    <div className="ml-3 text-xs mr-2">
                        <Select options={editorShapeTypeOptions} defaultValue={{value:EditorShapeType.RECT as string,label:"Rect"}} onChange={(selected)=>{
                            let selectedType = (selected?.value ?? EditorShapeType.RECT) as EditorShapeType;
                            setSelectedShapeType(selectedType);
                        }}/>
                    </div>
                </div>

                <EditorShapeEditWidgetDetails {...{shapeKey: uiStateRef.current.selectedShapeKey,  shapeEntry: selectedShape, deleteShape: deleteKey , drawCanvas: redrawCanvas}}/>
            </>
        }
    </div>
}

function EditorShapeEditWidgetDetails(props: {shapeKey: string | null, shapeEntry: EditorShapesEntry | null, deleteShape: (key:string)=>void,  drawCanvas: () => void}) {
    let {shapeKey, deleteShape, shapeEntry,drawCanvas} = props;
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    if(shapeEntry === null || shapeKey === null) return <></>

    const shape = shapeEntry.shape;
    return <div className="flex flex-col">
            <div className="flex flex-row space-x-2">
                <div>Selected: {shapeKey} </div>            
                <Button text={"Delete"} onClick={()=> {
                    if(shapeKey != null){
                        deleteShape(shapeKey)
                        // drawCanvas();
                        // forceUpdate();
                    }
            } }/>
            </div>
            <div className="flex flex-row pl-2 pr-2 pt-2">
                <div className="flex flex-col mr-2">
                    <div> Fill: </div>
                        <Switch checked={( (!!shape.fill)? shape.fill.a > 0 : false ) } onChange={(event)=>{
                            if(event.target.checked){
                                if(!shape.fill){
                                    shape.fill =  { r: 0, g: 0, b: 0, a: 255 }; 
                                }else{
                                    shape.fill.a = 255;
                                }
                            }else{
                                if(shape.fill){
                                    shape.fill.a = 0;
                                }
                            }
                            drawCanvas();
                            forceUpdate();
                        }}/>
                    { shape.fill && <SketchPicker color={colorDataToPickerColor(shape.fill ?? { r: 0, g: 0, b: 0, a: 255 })} onChange={(colRes) => {
                        shape.fill = pickerColorToColorData(colRes.rgb);
                        drawCanvas();
                        forceUpdate();
                    } } />}
                </div>
                <div className="flex flex-col">
                    <div> Stroke: </div>
                    <Switch checked={( (!!shape.stroke)? shape.stroke.color.a > 0 : false ) } onChange={(event)=>{
                            if(event.target.checked){
                                if(!shape.stroke){
                                    shape.stroke =  {color:{ r: 0, g: 0, b: 0, a: 255 },weight: 3}; 
                                }else{
                                    shape.stroke.color.a = 255;
                                }
                            }else{
                                if(shape.stroke){
                                    shape.stroke.color.a = 0;
                                }
                            }
                            drawCanvas();
                            forceUpdate();
                        }}/>
                    <SketchPicker color={colorDataToPickerColor(shape.stroke?.color ?? { r: 0, g: 0, b: 0, a: 255 })} onChange={(colRes) => {
                        const color = pickerColorToColorData(colRes.rgb);
                        if (shape.stroke === undefined) {
                            shape.stroke = { color, weight: 0 };
                        } else {
                            shape.stroke.color = color;
                        }
                        drawCanvas();
                        forceUpdate();
                    } } />
                    <input type="range" min={0} max={20} step={0.1} className="ml-5 mr-3" value={shape.stroke?.weight ?? 0} onChange={(ch) => {
                        if (shape.stroke === undefined) {
                            shape.stroke = { color: { r: 0, g: 0, b: 0, a: 255 }, weight: ch.target.valueAsNumber };
                        } else {
                            shape.stroke.weight = ch.target.valueAsNumber;
                        }
                        drawCanvas();
                        forceUpdate();
                    } } />
                </div>
            </div>
        </div>
}
function vectorInShape(vec: Vector2, shape: EditorShapeRect, spec: { tolerance?: number,}) :boolean {
    let tolerance = spec?.tolerance ?? 0
    switch(shape.type){
        case EditorShapeType.RECT: {
            const lx = shape.origin.x ;
            const rx = shape.origin.x + shape.extent.x
            const minX = Math.min(lx,rx) - tolerance
            const maxX = Math.max(lx,rx) + tolerance
            const ly = shape.origin.y ;
            const ry = shape.origin.y + shape.extent.y
            const minY = Math.min(ly,ry) - tolerance
            const maxY = Math.max(ly,ry) + tolerance
            return (minX< vec.x) &&( vec.x < maxX) && (minY < vec.y ) && (vec.y < maxY)
        }

    }
}



