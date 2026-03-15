# PTB 句法树规则参考手册 (基于 Stanza)

本参考手册基于 Penn Treebank (PTB) 标签体系, 用于解析句法树中的各类节点标记. 所有标记划分为从句级别, 短语级别和词汇级别.

## 一 从句级别 (Clause Level)

| 简称 | 全称 | 中文 | 解释 |
|------|------|------|------|
| S | Simple declarative clause | 简单陈述句 | 不由(可能为空的)从属连词或 wh-词引导, 且没有主谓倒装的简单陈述句. |
| SBAR | Subordinate clause | 从属从句 | 由(可能为空的)从属连词引导的从句. |
| SBARQ | Direct question | 直接疑问句 | 由 wh-词或 wh-短语引导的直接疑问句. 间接疑问句和关系从句应标注为 SBAR, 而不是 SBARQ. |
| SINV | Inverted declarative sentence | 倒装陈述句 | 主语位于时态动词或情态动词之后的倒装陈述句. |
| SQ | Inverted yes/no question | 倒装一般疑问句 | 倒装的一般疑问句, 或 SBARQ 中 wh-短语之后的 wh-疑问句的主句部分. |

## 二 短语级别 (Phrase Level)

| 简称 | 全称 | 中文 | 解释 |
|------|------|------|------|
| ADJP | Adjective Phrase | 形容词短语 | 形容词短语. |
| ADVP | Adverb Phrase | 副词短语 | 副词短语. |
| CONJP | Conjunction Phrase | 连词短语 | 连词短语. |
| FRAG | Fragment | 句子片段 | 句子片段. |
| INTJ | Interjection | 感叹语 | 感叹语. 大致对应于词性标签 UH. |
| LST | List marker | 列表标记 | 列表标记. 包含其周围的标点符号. |
| NAC | Not a Constituent | 非句法成分 | 非句法成分; 用于显示 NP 内某些名词前修饰语的作用域. |
| NP | Noun Phrase | 名词短语 | 名词短语. |
| NX | Head of complex NP | 复杂名词短语中心 | 用于某些复杂 NP 中标记 NP 的中心语. 大致对应 N-bar 级别, 但用法差异很大. |
| PP | Prepositional Phrase | 介词短语 | 介词短语. |
| PRN | Parenthetical | 插入语 | 插入语成分. |
| PRT | Particle | 小品词 | 小品词. 适用于应标记为 RP 的词的类别. |
| QP | Quantifier Phrase | 量词短语 | 量词短语(即复杂的度量/数量短语); 在 NP 内使用. |
| RRC | Reduced Relative Clause | 缩略关系从句 | 缩略关系从句. |
| UCP | Unlike Coordinated Phrase | 非对等并列短语 | 非对等并列短语. |
| VP | Verb Phrase | 动词短语 | 动词短语. |
| WHADJP | Wh-adjective Phrase | wh-形容词短语 | 包含 wh-副词的形容词短语, 例如 how hot. |
| WHAVP | Wh-adverb Phrase | wh-副词短语 | 引导带有 NP 缺口的从句. 可以为空(包含 0 补语)或词汇化的(包含 wh-副词, 如 how 或 why). |
| WHNP | Wh-noun Phrase | wh-名词短语 | 引导带有 NP 缺口的从句. 可以为空(包含 0 补语)或词汇化的(包含某些 wh-词, 如 who, which book, whose daughter, none of which, 或 how many leopards). |
| WHPP | Wh-prepositional Phrase | wh-介词短语 | 包含 wh-名词短语(如 of which 或 by whose authority)的介词短语, 它要么引导一个 PP 缺口, 要么被包含在 WHNP 中. |
| X | Unknown / Unbracketable | 未知/无法定界成分 | 未知, 不确定或无法定界的成分. X 常用于标注拼写错误以及 the...the- 结构. |

## 三 词汇级别 (Word Level)

| 简称 | 全称 | 中文 | 解释 |
|------|------|------|------|
| CC | Coordinating conjunction | 并列连词 | 并列连词. |
| CD | Cardinal number | 基数词 | 基数词. |
| DT | Determiner | 限定词 | 限定词. |
| EX | Existential there | 存在句引导词 | 存在句中的 there. |
| FW | Foreign word | 外来词 | 外来词. |
| IN | Preposition or subordinating conjunction | 介词/从属连词 | 介词或从属连词. |
| JJ | Adjective | 形容词 | 形容词. |
| JJR | Adjective, comparative | 形容词比较级 | 形容词比较级. |
| JJS | Adjective, superlative | 形容词最高级 | 形容词最高级. |
| LS | List item marker | 列表项标记 | 列表项标记. |
| MD | Modal | 情态动词 | 情态动词. |
| NN | Noun, singular or mass | 单数/不可数名词 | 名词, 单数或不可数. |
| NNS | Noun, plural | 复数名词 | 名词, 复数. |
| NNP | Proper noun, singular | 单数专有名词 | 专有名词, 单数. |
| NNPS | Proper noun, plural | 复数专有名词 | 专有名词, 复数. |
| PDT | Predeterminer | 前位限定词 | 前位限定词. |
| POS | Possessive ending | 所有格结尾 | 所有格结尾. |
| PRP | Personal pronoun | 人称代词 | 人称代词. |
| PRP$ | Possessive pronoun | 物主代词 | 物主代词 (Prolog 版本为 PRP-S). |
| RB | Adverb | 副词 | 副词. |
| RBR | Adverb, comparative | 副词比较级 | 副词比较级. |
| RBS | Adverb, superlative | 副词最高级 | 副词最高级. |
| RP | Particle | 小品词 | 小品词. |
| SYM | Symbol | 符号 | 符号. |
| TO | to | to 标记 | 单词 to. |
| UH | Interjection | 感叹词 | 感叹词. |
| VB | Verb, base form | 动词原形 | 动词, 原形. |
| VBD | Verb, past tense | 动词过去式 | 动词, 过去式. |
| VBG | Verb, gerund / present participle | 动名词/现在分词 | 动词, 动名词或现在分词. |
| VBN | Verb, past participle | 动词过去分词 | 动词, 过去分词. |
| VBP | Verb, non-3rd person singular present | 非第三人称单数现在时 | 动词, 非第三人称单数现在时. |
| VBZ | Verb, 3rd person singular present | 第三人称单数现在时 | 动词, 第三人称单数现在时. |
| WDT | Wh-determiner | wh-限定词 | wh-限定词. |
| WP | Wh-pronoun | wh-代词 | wh-代词. |
| WP$ | Possessive wh-pronoun | wh-物主代词 | wh-物主代词 (Prolog 版本为 WP-S). |
| WRB | Wh-adverb | wh-副词 | wh-副词. |
