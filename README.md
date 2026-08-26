# 盾を構えとけば何とか凌げる - Prototype 02

スマホブラウザ向けの見下ろし型アクション試作です。
`index.html` を開くだけで動作します。GitHub Pages にそのまま配置できます。

## Prototype 02 の変更

- 水色キツネ勇者を2頭身寄りに変更
- 足・ブーツを追加し、移動中に歩行モーション
- ジャンプ時は身体ごと大きく浮く表現を強化
- 毛色だけでなく、青い服・黄色い裾・茶色ベルト／ブーツなど複数色を使用
- 盾を大きな金属製の勇者盾らしいデザインへ変更
- 剣は薙ぎ払い、槍は突き、ハンマーは大振りで実際に武器が動く
- 赤杖／青杖は近接攻撃を廃止し、遠距離魔法弾を発射
- 赤魔法は草を燃やせる
- 青魔法は水面を凍らせる
- 既存の移動速度・ジャンプのスピード感・盾の強さは維持

## 操作

- 左スティック: 移動
- 盾: 長押しで防御。正面の広い範囲を防ぎ、防御中HP回復
- 攻撃ボタン: タップで通常攻撃、長押し後に離すとチャージ攻撃
- ジャンプ: 高く跳び、敵の攻撃や包囲を抜ける
- スキル: ダッシュ攻撃
- チェンジ: 剣 → 槍 → ハンマー → 赤杖 → 青杖

PC確認用: WASD/矢印=移動、J=盾、K=攻撃、L=ジャンプ、I=スキル、Q=武器チェンジ

## Prototype 03 changes
- Fox fur is now mainly white with light-blue accents.
- Shield is circular and pushed forward in the facing direction.
- Spear uses a straight thrust streak instead of a slash arc.
- Fire/ice magic now spawns from the staff tip.
- Added a visually narrower route and a translucent objective arrow.


## Prototype 04
- 上向き時の盾レイヤーを調整
- 右向き時の盾を腕・剣と自然な高さへ移動
- 左右向きの円盾を横から見た縦長の楕円に変更
- 左向き時は剣を盾の奥に描画

## Prototype 05
- 上向き: 盾の裏面→左手/グリップ→武器→身体、の順に変更
- 上向き: 胴体も盾より手前に表示
- 右向き: 剣を持つ右手を低くし、身体の奥に隠れる描画順へ変更
- 左向き: 盾を最奥、身体を中央、剣を持つ右手を最前面へ変更
