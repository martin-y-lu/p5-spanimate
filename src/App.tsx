import React, { useEffect, useMemo, useRef, useState } from 'react';

import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import p5 from "p5";
import { juliaSetScript, testSketch } from './data';
import { EditorDataType, EditorState, EditorStateInterface, cleanEditorData } from './edit/editorState';
import { DragWindow } from './ui/dragWindow';
import { EditorDisplayEntry, EditorStateDisplay } from './edit/editorStateDisplay';
import { Button } from './ui/button';
import assert from 'assert';
import { EvalResult, Vector2, evalScript, getErrorMessage } from './sketch/runtime';

/**
 *  Todo:
 *  1) Editor state system
 *    - 
 *  2) Editor state widgets
 *  3) Animation curves + widgets
 */


type LogEntry = {
  err: boolean,
  log: string,
} 



const startCode = testSketch;
function App() {
  let canvasParentRef = useRef<HTMLDivElement>(null);

  let [srcValue,setSrcValue] = useState<string>(startCode)
  let [pSketch,setPSketch] = useState<p5|null>(null);
  
  let [errorMessage,setErrorMessage] = useState<string|null>(null);
  let logEntries = useRef<LogEntry[]>([{err:false,log:"Test Log"},{err:true,log:"Test Err"}]);
  let eState = useRef<EditorState>(
    new EditorState({
        hi:{valueInfo:{type:EditorDataType.ANY, value: "hello!"}},
        colGrid: {
          data:{
            5:{valueInfo:{type:EditorDataType.ANY, value: 50},
            data:{
              5: {valueInfo:{type:EditorDataType.VECTOR2, value: new Vector2(0,0) ,editOrigin: new Vector2(0,0), editScale:50}},
            }
          }
          }
        },
      })
    
  )
  function addEntry(err:boolean,log:string){
    logEntries.current = [...logEntries?.current,{err,log}]
  }

  function saveScene(fileName:string){
    const data = JSON.stringify({src:srcValue,edit:eState.current.data.data})
    const blob = new Blob([data],{type:"octet-stream"})
    const href = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = href;
    link.setAttribute(
      'download',
      `${fileName}.json`,
    );

    // Append to html link element page
    document.body.appendChild(link);

    // Start download
    link.click();

    // Clean up and remove the link
    link.remove();
    URL.revokeObjectURL(href);
  }
  async function loadScene(file?: File){
    if(!file) return;
    let content :string | ArrayBuffer | null |undefined = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = (e) => {
        try {
          // Resolve the promise with the response value
          resolve(e.target?.result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsText(file);
    });
    if(typeof content !== "string") return 
    console.log({content})
    try{
      const scene = JSON.parse(content);
      console.log("setting", scene)
      setSrcValue(scene?.src)
      eState.current = new EditorState(cleanEditorData(scene?.edit));
      removeSketch()
    }catch(e){
      console.error(e)
    }
  }

 
  function makeSketch(){
    if(canvasParentRef.current!= null){
      if(pSketch!==null){
        pSketch.remove();
      }
      logEntries.current = []
      setErrorMessage(null);

      let res : EvalResult = evalScript(srcValue)
      if (res.ok === true){
        let sketch = res.sketch;
        try{
          
          let tappedSketch = (p:p5)=>{
           
            // console.log('currentEState',eState.current)
            let interf = eState.current.makeSketchInterface();

             // let oldLog = console.log
            //  console.log = function (message) {
            //   addEntry(false, JSON.stringify(message))
            // }
            sketch(p,interf);

            for( const methodName of ["setup","draw","mouseClicked"]){
              if (! (methodName in (p as any))) continue
              let prevMethod = (p as any)[methodName];
              (p as any) [methodName] = ()=>{
                eState.current.resetStack();
                try {
                  prevMethod();
                }catch(e){
                  addEntry(true,getErrorMessage(e));
                  // setErrorMessage(`Runtime error: ${getErrorMessage(e)}`)
                  // console.log(e)
                }
              } 
            }
           
          }
          let sk = new p5(tappedSketch,canvasParentRef.current)
          setPSketch(sk);
          setErrorMessage(null);
        }catch (err) {
          removeSketch(`Compile error 2: ${getErrorMessage(err)}`)
          canvasParentRef.current.innerHTML="";
        }
      }else{
        setErrorMessage(`Compile error: ${res.errorMessage}`);
      }
    }
  }
  function removeSketch(error?:string){
    if(pSketch){
      pSketch.remove();
      setPSketch(null);
    }
    logEntries.current = []
    setErrorMessage(error ?? null);
  }
  useEffect(()=>{
    // const canvas = canvasRef.current;
    // const ctx = canvas?.getContext('2d');
    // if(ctx) testDraw(ctx)

    return ()=>{
      pSketch?.remove();
    }
  },[canvasParentRef])
  
  return (
    <div className="">
      <DragWindow defaultPosition = {{x:20,y:20}} header={{title:"Spanimate"}}>
        <div className = "flex pl-3 pt-2 pb-2 space-x-2">
          <Button text = "Save scene" onClick={()=>{
            saveScene("test")            
          }}/>
          {/* <input type="text" name="key" autoComplete="off" className=" mr-1" value = {"test"} onChange = {(ch)=>{}}/> */}
          {/* <Button text = "Load scene" onClick={()=>{}}/> */}
          <input type="file" accept=".json" onChange={e => 
            {
                let file = e?.target?.files?.[0];
                loadScene(file);
            }} /> 
        </div>
      </DragWindow>

      <DragWindow defaultPosition = {{x:20,y:100}} header={{title:"Sketch"}}>
        <CodeMirror
          value={srcValue}
          onChange={(newVal,viewUpdate)=>{
            setSrcValue(newVal);
            // console.log(newVal,viewUpdate)
          }}
          height="100%"
          extensions={[javascript({ })]}
        />
        {/* {eValue} */}
      </DragWindow>
     

      <DragWindow defaultPosition={{x:800,y:100}} header={{title:"Preview"}} >
        <div className = "flex pl-3 pt-2 pb-2 space-x-2">
        <Button text='Run Sketch' onClick={()=>{makeSketch()}}/>
        <Button text='Stop Sketch' onClick={()=>{removeSketch()}}/>
        </div>
        <div className={pSketch!= null?"mb-2":""} ref={canvasParentRef} />
        <div className="font-mono text-red-600 bg-red-300 pl-3">
          {errorMessage}
        </div>
        <div className="flex flex-col"> 
          { logEntries.current && logEntries.current.slice(logEntries.current.length-5).map( (entry,ind)=>{
              return  <div key={ind} className={`font-mono ${entry.err?"bg-red-300" : "bg-slate-200" } pl-3 w-full`}>
                {">"} {entry.log}
              </div>
            })
          }
        </div>
      </DragWindow>

      <DragWindow defaultPosition={{x:800,y:600}} header={{title:"Editor"}}>
          {/* <EditorStateDisplay editorData={eState.current.data}/> */}
          <EditorDisplayEntry editorData={{root:eState.current.data}} ind='root' depth={0}/>
      </DragWindow>
    </div>
  );
} 

export default App;
