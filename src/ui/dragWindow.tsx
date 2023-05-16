import logo from './logo.svg';
import Draggable, {ControlPosition, DraggableCore} from 'react-draggable';
export type DragWindowProps = {
    defaultPosition?:ControlPosition,
    header: {
      title: string,
      close?:{
        onClose: React.MouseEventHandler<HTMLDivElement>,
      }
    }
}
export function DragWindow(props:React.PropsWithChildren<DragWindowProps>){
  let {defaultPosition, header:{title,close}} = props;
  const handleStart = ()=>{
  }
  const handleDrag = ()=>{

  }
  const handleStop = ()=>{

  }
  return <Draggable
  axis="both"
  handle=".handle"
  defaultPosition={ defaultPosition ?? {x: 50, y: 50}}
  // position={null}
  scale={1}
  onStart={handleStart}
  onDrag={handleDrag}
  onStop={handleStop}>
  <div className='h-screen pointer-events-none absolute w-full'>
    <div className= 'w-5/12 border-spacing-1 bg-slate-50 stroke-slate-800 border-2 rounded-t-md pointer-events-auto max-h-scree='>
      <div className="handle flex flex-row justify-between content-center pr-1 pl-2 bg-slate-100 ">
        <div className="flex-initial w-20">
          {title}
        </div>
        <div className="flexNone w-1/3 flex justify-end items-center ">
          {
            close && 
            <div 
              className="flex-none text-center align-middle  h-5 w-5 bg-red-200 hover:bg-red-300  border rounded-full"
              onClick={close.onClose}
            />
          }
        </div>
      </div>
      <div className="pt-1">
        {props.children}
      </div>
    </div>
  </div>
</Draggable>
}
