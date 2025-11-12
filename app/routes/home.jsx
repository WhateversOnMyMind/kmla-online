import { useEffect, useState } from "react";
import { getSupabase } from "../supabaseClient";

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const USER_NAME = "30기 고동재";

function getTodayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const startUTC = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString();
    const endUTC = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString();
    return { start: startUTC, end: endUTC };
}

function getVideoId(url) {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
        return parsed.searchParams.get("v");
    } catch {
        return null;
    }
}

async function getVideoTitle(videoId) {
    if (!videoId) return "Unknown Video";
    try {
        const res = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`
        );
        const data = await res.json();
        return data.items?.[0]?.snippet?.title || "Unknown Video";
    } catch {
        return "Unknown Video";
    }
}

export default function MorningMusic() {
    const [todaySongs, setTodaySongs] = useState([null, null]);
    const [pastSongs, setPastSongs] = useState([]);
    const [loadingCancelId, setLoadingCancelId] = useState(null);

    useEffect(() => {
        const supabase = getSupabase();

        async function fetchTodaySongs() {
            const { start, end } = getTodayRange();
            const { data, error } = await supabase
                .from("items")
                .select("id, name, url, date")
                .gte("date", start)
                .lt("date", end)
                .order("date", { ascending: true })
                .limit(2);

            if (error) {
                console.error(error);
                return;
            }

            const enriched = await Promise.all(
                (data || []).map(async (song) => {
                    const videoId = getVideoId(song.url);
                    const title = await getVideoTitle(videoId);
                    const thumbnail = videoId
                        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                        : "/default-thumbnail.png";
                    return { ...song, title, thumbnail };
                })
            );

            while (enriched.length < 2) enriched.push(null);
            setTodaySongs(enriched);
        }

        async function fetchPastSongs() {
            const { data, error } = await supabase
                .from("items")
                .select("id, name, url, date")
                .eq("name", USER_NAME)
                .order("id", { ascending: false });

            if (error) {
                console.error(error);
                return;
            }

            const enriched = await Promise.all(
                (data || []).map(async (song) => {
                    const videoId = getVideoId(song.url);
                    const title = await getVideoTitle(videoId);
                    return { ...song, title };
                })
            );

            setPastSongs(enriched);
        }

        fetchTodaySongs();
        fetchPastSongs();
    }, []);

    async function handleCancel(id) {
        const supabase = getSupabase();
        if (!id) return;
        setLoadingCancelId(id);

        const prev = pastSongs;
        setPastSongs((list) => list.filter((s) => s.id !== id));

        const { error } = await supabase.from("items").delete().eq("id", id);

        setLoadingCancelId(null);
        if (error) {
            console.error(error);
            setPastSongs(prev);
            alert("삭제에 실패했어요.");
        }
    }

    return (
        <div className="min-h-screen bg-[#F8F8FA] px-[5vw] py-[5vw]">
            {/* Header */}
            <div className="mt-[2vh] mb-[3vh] flex flex-row items-center">
                <img
                    src="/musicnote.png"
                    alt="musical note"
                    className="mr-[2vw] h-[30px] w-[30px]"
                />
                <h1 className="m-0 text-[24px] leading-[34px] tracking-[-0.025em] font-semibold lg:text-[40px]">
                    기상송
                </h1>
            </div>

            {/* 오늘의 기상송 */}
            <section className="mb-[5vh]">
                <h2 className="mt-0 mb-[2vh] text-[16px] leading-6 tracking-[-0.025em] font-semibold">
                    오늘의 기상송
                </h2>

                <div className="flex flex-col gap-[1vh]">
                    {todaySongs.map((song, idx) => (
                        <div
                            key={song?.id ?? `slot-${idx}`}
                            className="min-h-[80px] overflow-hidden rounded-[12px] bg-white flex items-center p-0 lg:min-h-[120px]"
                        >
                            <img
                                src={song?.thumbnail || "/default-thumbnail.png"}
                                alt={song?.title || "빈 슬롯"}
                                className="h-[80px] w-[120px] flex-shrink-0 object-cover rounded-l-[12px] lg:h-[120px] lg:w-[200px]"
                            />
                            <div className="flex-1 px-4 py-3">
                                <b className="block mb-1 text-[14px] font-semibold lg:text-[18px]">
                                    {song?.title || "아직 비어있음"}
                                </b>
                                <p className="m-0 p-0 text-[12px] font-normal text-[#545454] lg:text-[16px]">
                                    {song?.name || "신청 대기 중…"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 신청 목록 */}
            <section className="mb-[10vh] flex flex-col">
                <h2 className="mb-[2vh] text-[16px] leading-6 tracking-[-0.025em] font-semibold">
                    신청목록 (전체 · {USER_NAME})
                </h2>

                <div className="flex flex-col gap-[1.5vh]">
                    {pastSongs.length === 0 ? (
                        <p className="opacity-70">신청 내역이 없어요.</p>
                    ) : (
                        pastSongs.map((song) => (
                            <div
                                key={song.id}
                                className="min-h-[60px] rounded-[12px] bg-white px-5 py-4 flex items-center justify-between"
                            >
                                <b className="text-[14px] font-medium lg:text-[16px]">
                                    {song.title}
                                </b>
                                <button
                                    className="flex h-8 w-8 items-center justify-center cursor-pointer border-none bg-transparent p-0 hover:opacity-70"
                                    onClick={() => handleCancel(song.id)}
                                    disabled={loadingCancelId === song.id}
                                    title="이 신청 삭제"
                                >
                                    <img
                                        src="/delete.png"
                                        alt="cancel"
                                        className="h-6 w-6"
                                        style={{
                                            opacity: loadingCancelId === song.id ? 0.5 : 1,
                                        }}
                                    />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* 제출 버튼 */}
            <button
                className="fixed bottom-[5vh] right-[5vw] cursor-pointer border-none bg-transparent p-0 hover:opacity-80"
                onClick={() => {

                }}
            >
                <img src="/button.png" alt="button" className="h-[60px] w-[60px]" />
            </button>
        </div>
    );
}
