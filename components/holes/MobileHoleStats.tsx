type HoleStat = {
  hole_number: number;
  par: number | null;
  handicap: number |null;
  yardage: number | null;
  rounds_played: number;
  avg_score: number | null;
  birdie_count: number;
  par_count: number;
  bogey_count: number;
  double_or_worse_count: number;
};

function pct(count:number,total:number){
    if(!total) return "-";
    return `${Math.round((count/total)*100)}%`;
}

export default function MobileHoleStats({
    stats
}:{
    stats:Map<number,HoleStat>;
}){

    return(
        <div className="space-y-4 md:hidden">
            {Array.from(stats.values()).map((hole)=>(
                <div
                    key={hole.hole_number}
                    className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm"
                >

                    <div className="flex justify-between items-center">

                        <div>
                            <div className="text-xl font-bold">
                                Hole {hole.hole_number}
                            </div>

                            <div className="text-sm text-gray-600">
                                Par {hole.par} • {hole.yardage ?? "-"} yds • HCP {hole.handicap ?? "-"}
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-xs text-gray-500">
                                Avg
                            </div>

                            <div className="text-3xl font-bold">
                                {hole.avg_score?.toFixed(2) ?? "-"}
                            </div>
                        </div>

                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">

                        <Card
                            title="Rounds"
                            value={hole.rounds_played}
                        />

                        <Card
                            title="Birdie %"
                            value={pct(hole.birdie_count,hole.rounds_played)}
                            color="green"
                        />

                        <Card
                            title="Par %"
                            value={pct(hole.par_count,hole.rounds_played)}
                        />

                        <Card
                            title="Bogey %"
                            value={pct(hole.bogey_count,hole.rounds_played)}
                            color="yellow"
                        />

                        <Card
                            title="Double+ %"
                            value={pct(hole.double_or_worse_count,hole.rounds_played)}
                            color="red"
                        />

                    </div>

                </div>
            ))}
        </div>
    );
}

function Card({
    title,
    value,
    color
}:{
    title:string;
    value:string|number;
    color?:"green"|"yellow"|"red";
}){

    const bg={
        green:"bg-green-50",
        yellow:"bg-yellow-50",
        red:"bg-red-50"
    }[color ?? "green"] ?? "bg-gray-50";

    return(
        <div className={`${bg} rounded-lg p-3`}>
            <div className="text-xs font-semibold text-gray-500">
                {title}
            </div>

            <div className="mt-1 text-xl font-bold">
                {value}
            </div>
        </div>
    )
}