/* =========================================================
   SOLARICH 1000 着せ替えシート カタログ枠
   10カテゴリー × 10枠。中身は空。
   カテゴリー名は仮。決まり次第このファイルの name を書き換える。
   ========================================================= */
const CATEGORY_COUNT = 10;
const ITEMS_PER_CATEGORY = 10;

const CATALOG = Array.from({ length: CATEGORY_COUNT }, (_, i) => {
  const cid = "c" + String(i + 1).padStart(2, "0");
  return {
    id: cid,
    name: `カテゴリー ${String(i + 1).padStart(2, "0")}`,
    items: Array.from({ length: ITEMS_PER_CATEGORY }, (_, j) => ({
      id: `${cid}-${String(j + 1).padStart(2, "0")}`,
      no: j + 1,
      name: ""
    }))
  };
});
