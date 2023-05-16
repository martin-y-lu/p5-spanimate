export function Button(props:{text: string, onClick:()=>any, style?:string}){
    const {text, onClick,style} = props;
    return  <button className = {`${style} bg-slate-200 hover:bg-slate-300 pl-4 pr-4 rounded-lg border-slate-600`} onClick={onClick}>
        {text}
    </button>  
}