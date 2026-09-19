// ==========================================
// 1. تشغيل سيرفر الـ Keep-Alive
// ==========================================
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.status(200).send('Boxtar Bot is active! 🚀');
});

app.get('/ping', (req, res) => {
  res.status(200).send('PONG');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// ==========================================
// 2. كود بوت ديسكورد الشامل والكامل بجميع الأنظمة
// ==========================================
const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');

const { createCanvas, loadImage } = require('@napi-rs/canvas');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

const afkUsers = new Map();
const logChannels = new Map();
const ticketData = new Map();         
const applicationsData = new Map(); 
const customShortcuts = new Map();    
const commandRoles = new Map();        

// نظام التحذيرات المحدث (${guildId}_${userId} -> array of warnings)
const userWarnings = new Map();

// إعدادات ونظام اللفلات المحدث
const levelSettings = new Map();   
const userLevels = new Map();      

const azkarSettings = new Map();
const protectionSettings = new Map();

const jailSettings = new Map(); 
const jailedUsers = new Map();  

const badWordsDB = new Map(); 
const badWordsPunishment = new Map(); 

const azkarList = [
  "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ العَظِيمِ.",
  "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ العَلِيِّ العَظِيمِ.",
  "أَسْتَغْفِرُ اللَّهَ العَظِيمَ وَأَتُوبُ إِلَيْهِ.",
  "لَا إِلَهَ إِلَّا اللَّه وحدَهُ لا شريكَ لهُ، لهُ الملكُ ولهُ الحمدُ وهوَ على كلِّ شيءٍ قديرٌ.",
  "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ."
];

const commands = [
  new SlashCommandBuilder()
    .setName('admin-setup')
    .setDescription('تحديد الرتب المصرح لها باستخدام الأوامر الإدارية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('shortcut')
    .setDescription('لوحة أزرار تفاعلية لإنشاء وإدارة اختصارات جميع الأوامر الإدارية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('تقديم').setDescription('إدارة وتخصيص لوحات التقديم الأربعة (5 أسئلة، بانر، رتبة قبول، وروم الاستقبال)'),
  new SlashCommandBuilder().setName('ticket-setup').setDescription('تخصيص وإعداد لوحة الدعم والتذاكر (الألوان، العنوان، والإرسال)'),
  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('إعداد وتحديد قنوات السجلات الخاصة والإجراءات والتذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('level-setup')
    .setDescription('إعداد وتخصيص نظام اللفلات، تفعيل/إيقاف، XP الرسائل، ورومات الصوت')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('level')
    .setDescription('عرض بطاقة اللفل المصورة وإحصائيات الـ XP')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض لفله').setRequired(false)),

  new SlashCommandBuilder()
    .setName('top')
    .setDescription('عرض قائمة أعلى 10 أشخاص لفلات وأكس بي في السيرفر')
    .addStringOption(opt => 
      opt.setName('الفترة')
        .setDescription('اختر نطاق الفترة الزمنية للترتيب')
        .setRequired(false)
        .addChoices(
          { name: 'آخر يوم', value: 'day' },
          { name: 'آخر أسبوع', value: 'week' },
          { name: 'آخر شهر', value: 'month' },
          { name: 'الكل (دائم)', value: 'all' }
        )
    ),

  new SlashCommandBuilder()
    .setName('afk')
    .setDescription('تفعيل وضع الغياب AFK')
    .addStringOption(opt => opt.setName('سبب').setDescription('سبب الغياب (اختياري)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('bad-words')
    .setDescription('لوحة التحكم الكاملة بالكلمات المحظورة والعقوبات التلقائية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('azkar-setup')
    .setDescription('إعداد وتفعيل نظام الأذكار التلقائية في السيرفر')
    .addChannelOption(opt => opt.setName('القناة').setDescription('اختر قناة الأذكار').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('الساعات')
        .setDescription('الفاصل الزمني بين كل ذكر والآخر بالساعات')
        .setRequired(true)
        .addChoices(
          { name: 'ساعة واحدة', value: 1 },
          { name: 'ساعتان', value: 2 },
          { name: '3 ساعات', value: 3 },
          { name: '6 ساعات', value: 6 },
          { name: '12 ساعة', value: 12 },
          { name: '24 ساعة (يومياً)', value: 24 }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('azkar').setDescription('إرسال ذكر عشوائي فوراً في القناة الحالية'),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('حظر عضو من السيرفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد حظره').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الحظر').setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('طرد عضو من السيرفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد طرده').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الطرد').setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('كتم عضو مؤقتاً')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد كتمه').setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('المدة')
        .setDescription('حدد مدة الكتم')
        .setRequired(true)
        .addChoices(
          { name: '5 دقائق', value: 5 * 60 * 1000 },
          { name: '10 دقائق', value: 10 * 60 * 1000 },
          { name: '1 ساعة', value: 60 * 60 * 1000 },
          { name: '1 يوم', value: 24 * 60 * 60 * 1000 },
          { name: '1 أسبوع', value: 7 * 24 * 60 * 60 * 1000 }
        )
    )
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الكتم').setRequired(true)),

  new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('إلغاء الكتم المؤقت عن العضو')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('سبب رفع الكتم').setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('إرسال تحذير إداري لعضو')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد تحذيره').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب التحذير').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('إزالة جميع التحذيرات عن العضو المحدد')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warnings-all')
    .setDescription('عرض جميع التحذيرات والأعضاء الذين عليهم تحذيرات في السيرفر'),

  new SlashCommandBuilder()
    .setName('warnings-member')
    .setDescription('عرض تحذيرات عضو محدد')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو لعرض تحذيراته').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warnings-clear-all')
    .setDescription('حذف جميع التحذيرات المسجلة في السيرفر دفعة واحدة')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('nick')
    .setDescription('تغيير لقب العضو في السيرفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو').setRequired(true))
    .addStringOption(opt => opt.setName('اللقب_الجديد').setDescription('اكتب اللقب الجديد').setRequired(true)),

  new SlashCommandBuilder()
    .setName('protection')
    .setDescription('لوحة إعدادات حماية السيرفر (السبام والروابط)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('jail-setup')
    .setDescription('لوحة إعداد نظام السجن الشامل')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('jail')
    .setDescription('سجن عضو وسحب كافة رتبه وتوثيق السجل')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المسجون').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('سبب السجن').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unjail')
    .setDescription('إفراج عن عضو مسجون وإعادة رتبه السابقة')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو للإفراج عنه').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('مسح عدد محدد من الرسائل في الروم')
    .addIntegerOption(opt => opt.setName('العدد').setDescription('من 1 إلى 100').setRequired(true)),
  
  new SlashCommandBuilder().setName('lock').setDescription('قفل الروم الحالية'),
  new SlashCommandBuilder().setName('unlock').setDescription('فتح الروم الحالية'),
  new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),

  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('عرض صورة الحساب')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض صورته').setRequired(false)),

  new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('عرض تفاصيل الحساب')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض معلوماته').setRequired(false)),

  new SlashCommandBuilder().setName('server-info').setDescription('عرض معلومات السيرفر'),
  new SlashCommandBuilder().setName('help').setDescription('يعرض لك دليل وقائمة بجميع أوامر البوت ووظائفها بالتفصيل')
];

async function sendLog(guild, logType, title, color, fields) {
  const guildLogs = logChannels.get(guild.id);
  if (!guildLogs || !guildLogs[logType]) return;
  const channel = guild.channels.cache.get(guildLogs[logType]);
  if (!channel) return;

  const logEmbed = new EmbedBuilder()
    .setTitle(title)
    .addFields(fields)
    .setColor(color)
    .setTimestamp();

  await channel.send({ embeds: [logEmbed] }).catch(() => {});
}

function getRequiredXp(level) {
  return Math.floor(200 * Math.pow(1.2, level));
}

function canPunish(executor, target) {
  if (executor.id === target.id) return false; 
  if (executor.id === executor.guild.ownerId) return true; 
  if (target.id === executor.guild.ownerId) return false; 
  return executor.roles.highest.position > target.roles.highest.position;
}

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, options, guild, member, channel } = interaction;

      if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('🤖 دليل وقائمة أوامر ونقاط القوة في بوت Boxtar الشاملة')
          .setDescription('أهلاً بك يا عمرو! إليك شرح تفصيلي لجميع الأوامر والميزات المتاحة في البوت:')
          .addFields(
            { 
              name: '⭐ نظام اللفلات والتفاعل (Levels & XP)', 
              value: '`/level-setup` (تفعيل/إيقاف، تحديد XP الرسائل، تفعيل رومات الصوت)\n`/level` أو `?level` (عرض بطاقة اللفل المصورة وسرعة التقدم - مع زيادة 20% لكل لفل)\n`/top` (عرض قائمة الترتيب لأعلى 10 أعضاء مع خيارات الفترة: يوم، أسبوع، شهر، الكل)', 
              inline: false 
            },
            { 
              name: '📂 نظام التقديمات المطوّر (4 تقديمات)', 
              value: '`/تقديم` : إعداد اسم التقديم والبانر، تعيين الـ 5 أسئلة، رتبة القبول، وروم استقبال الطلبات مع أزرار الموافقة والرفض الفورية.', 
              inline: false 
            },
            { 
              name: '🎫 نظام التذاكر المتطور (Ticket Setup)', 
              value: '`/ticket-setup` (تخصيص عناوين التكت، تحديد ألوان الأزرار وألوان البانر بكل سهولة عبر الأزرار التفاعلية).', 
              inline: false 
            },
            { 
              name: '⛓️ نظام السجن المتكامل والمحدث', 
              value: '`/jail-setup` (تحديد رتبة السجين والسجان ورومات السجل)\n`/jail` و `/unjail` (سجن وإفراج الأعضاء مع حفظ الرتب السابقة تلقائياً)', 
              inline: false 
            },
            { 
              name: '⚠️ نظام التحذيرات والسجلات الإدارية', 
              value: '`/warn` (تحذير الأعضاء وتوثيق السجل)\n`/unwarn` (إزالة كافة التحذيرات عن العضو)\n`/warnings-all` (عرض كافة التحذيرات في السيرفر)\n`/warnings-member` (عرض تحذيرات عضو محدد)\n`/warnings-clear-all` (حذف جميع التحذيرات)', 
              inline: false 
            }
          )
          .setFooter({ text: 'تم البرمجة والتطوير بواسطة Boxtar System' })
          .setTimestamp();

        return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      }

      if (commandName === 'top') {
        await interaction.deferReply();
        const period = options.getString('الفترة') || 'all';

        const guildUsers = Array.from(userLevels.entries())
          .filter(([key]) => key.startsWith(`${guild.id}_`))
          .map(([key, data]) => {
            const userId = key.split('_')[1];
            return { userId, ...data };
          })
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 10);

        if (guildUsers.length === 0) {
          return interaction.editReply({ content: '❌ لا توجد أي بيانات لفلات مسجلة في هذا السيرفر حتى الآن.' });
        }

        const periodNames = {
          day: 'آخر يوم 📅',
          week: 'آخر أسبوع 📊',
          month: 'آخر شهر 🗓️',
          all: 'الكل (دائم) 🏆'
        };

        let descText = `🏆 **أبرز 10 أعضاء تفاعلاً في السيرفر**\n*الفترة الزمنية: ${periodNames[period]}*\n\n`;
        
        guildUsers.forEach((u, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `\`#${index + 1}\``;
          descText += `${medal} <@${u.userId}> ➔ المستوى: **${u.level}** | الـ XP: **${u.xp}**\n`;
        });

        const embed = new EmbedBuilder()
          .setTitle('📊 لوحة المتصدرين (Top Leaderboard)')
          .setDescription(descText)
          .setColor(0xE74C3C)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (commandName === 'bad-words') {
        await interaction.deferReply({ ephemeral: true });
        const currentPunish = badWordsPunishment.get(guild.id) || 'delete';
        const wordsSet = badWordsDB.get(guild.id) || new Set();

        const embed = new EmbedBuilder()
          .setTitle('🚫 لوحة تحكم الكلمات المحظورة (Bad Words)')
          .setDescription(`إجمالي الكلمات: **${wordsSet.size}**\nالعقوبة: \`${currentPunish.toUpperCase()}\``)
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_add_word').setLabel('إضافة كلمة').setEmoji('➕').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('bw_list_words').setLabel('عرض الكلمات').setEmoji('📋').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('bw_set_punishment').setLabel('تحديد العقوبة').setEmoji('⚖️').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_remove_word').setLabel('إزالة كلمة').setEmoji('➖').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('bw_clear_all').setLabel('إفراغ الكل').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
      }

      if (commandName === 'shortcut') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('⚡ لوحة إدارة اختصارات الأوامر الإدارية')
          .setDescription('اختر الإجراء أدناه لإدارة الاختصارات:')
          .setColor(0xE74C3C);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('sc_create').setLabel('إنشاء اختصار جديد').setEmoji('🔗').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('sc_list').setLabel('عرض الاختصارات').setEmoji('📜').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('sc_delete').setLabel('حذف اختصار').setEmoji('❌').setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'protection') {
        await interaction.deferReply({ ephemeral: true });
        const currentProt = protectionSettings.get(guild.id) || { antiSpam: false, antiLinks: false };

        const embed = new EmbedBuilder()
          .setTitle('🛡️ لوحة نظام الحماية الفعّال')
          .setDescription('تحقّق وتحكم بحماية السيرفر عبر الأزرار أدناه:')
          .addFields(
            { name: '🚫 حماية الروابط:', value: currentProt.antiLinks ? '✅ **مفعل**' : '❌ **متوقف**', inline: true },
            { name: '⚡ حماية السبام:', value: currentProt.antiSpam ? '✅ **مفعل**' : '❌ **متوقف**', inline: true }
          )
          .setColor(0xE74C3C);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prot_toggle_links').setLabel(currentProt.antiLinks ? 'إيقاف حماية الروابط' : 'تفعيل حماية الروابط').setStyle(currentProt.antiLinks ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId('prot_toggle_spam').setLabel(currentProt.antiSpam ? 'إيقاف حماية السبام' : 'تفعيل حماية السبام').setStyle(currentProt.antiSpam ? ButtonStyle.Danger : ButtonStyle.Success)
        );

        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'jail-setup') {
        await interaction.deferReply({ ephemeral: true });
        const jSettings = jailSettings.get(guild.id) || {};

        const roleName = jSettings.roleId ? `<@&${jSettings.roleId}>` : 'غير محدد ❌';
        const jailerName = jSettings.jailerRoleId ? `<@&${jSettings.jailerRoleId}>` : 'غير محدد ⚠️';
        const textChanName = jSettings.textChannelId ? `<#${jSettings.textChannelId}>` : 'غير محدد ❌';
        const logChanName = jSettings.logChannelId ? `<#${jSettings.logChannelId}>` : 'غير محدد ❌';

        const embed = new EmbedBuilder()
          .setTitle('⛓️ لوحة إعداد نظام السجن المتكامل')
          .setDescription('قم بتخصيص إعدادات السجن عبر القوائم التفاعلية أدناه:')
          .addFields(
            { name: '🏷️ رتبة السجين:', value: roleName, inline: true },
            { name: '🛡️ رتبة السجان:', value: jailerName, inline: true },
            { name: '💬 روم كتابة السجناء:', value: textChanName, inline: true },
            { name: '📋 قناة سجل السجن:', value: logChanName, inline: true }
          )
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('jail_set_role').setPlaceholder('1️⃣ اختر رتبة السجين...'));
        const row2 = new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('jail_set_jailer_role').setPlaceholder('2️⃣ اختر رتبة السجان...'));
        const row3 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('jail_set_text_channel').setPlaceholder('3️⃣ اختر روم الكتابة للسجناء...').addChannelTypes(ChannelType.GuildText));
        const row4 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('jail_set_log_channel').setPlaceholder('4️⃣ اختر قناة سجل السجن...').addChannelTypes(ChannelType.GuildText));

        return interaction.editReply({ embeds: [embed], components: [row1, row2, row3, row4] });
      }

      if (commandName === 'jail') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        const jSettings = jailSettings.get(guild.id);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود في السيرفر.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك معاقبة نفسك أو شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });
        if (!jSettings || !jSettings.roleId) return interaction.reply({ content: '❌ لم يتم إعداد رتبة السجن بعد!', ephemeral: true });

        if (jSettings.jailerRoleId && !member.permissions.has(PermissionFlagsBits.Administrator)) {
          if (!member.roles.cache.has(jSettings.jailerRoleId)) {
            return interaction.reply({ content: '❌ عذراً، أنت لا تمتلك رتبة السجان.', ephemeral: true });
          }
        }

        const memberRoles = targetMember.roles.cache.filter(r => r.id !== guild.id && r.id !== jSettings.roleId).map(r => r.id);
        const removedRoleMentions = memberRoles.map(rId => `<@&${rId}>`).join(', ') || 'لا توجد رتب أُزيلت';

        jailedUsers.set(`${guild.id}_${user.id}`, memberRoles);
        await targetMember.roles.remove(memberRoles).catch(() => {});
        await targetMember.roles.add(jSettings.roleId).catch(() => {});

        if (jSettings.textChannelId) {
          const jailTextChan = guild.channels.cache.get(jSettings.textChannelId);
          if (jailTextChan) {
            jailTextChan.send(`🚨 مرحباً ${targetMember}، لقد تم زجك في السجن. السبب: **${reason}**`).catch(() => {});
          }
        }

        await sendLog(guild, 'jail', '⛓️ سجل سجن عضو جديد', 0xE74C3C, [
          { name: '👤 العضو المعاقب:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 سبب العقوبة:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false },
          { name: '🏷️ الرتب المزالة:', value: removedRoleMentions, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم سجن العضو **${user.tag}** بنجاح.`, ephemeral: true });
      }

      if (commandName === 'unjail') {
        const user = options.getUser('العضو');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        const jSettings = jailSettings.get(guild.id);
        const savedRoles = jailedUsers.get(`${guild.id}_${user.id}`);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك تنفيذ هذا الإجراء على شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });
        if (!jSettings || !jSettings.roleId) return interaction.reply({ content: '❌ نظام السجن غير معدل.', ephemeral: true });

        await targetMember.roles.remove(jSettings.roleId).catch(() => {});
        if (savedRoles && savedRoles.length > 0) {
          await targetMember.roles.add(savedRoles).catch(() => {});
          jailedUsers.delete(`${guild.id}_${user.id}`);
        }

        await sendLog(guild, 'jail', '🔓 سجل الإفراج عن مسجون', 0x2ECC71, [
          { name: '👤 العضو المُفرج عنه:', value: `${user} (${user.tag})`, inline: false },
          { name: '🛡️ الإداري بواسطة:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم فك سجن العضو **${user.tag}** وإعادة رتبه.`, ephemeral: true });
      }

      if (commandName === 'nick') {
        const user = options.getUser('العضو');
        const newNick = options.getString('اللقب_الجديد');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك تغيير لقب شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });
        
        await targetMember.setNickname(newNick).catch(() => {});
        return interaction.reply({ content: `✅ تم تغيير لقب العضو ${user.tag} إلى **${newNick}**.`, ephemeral: true });
      }

      if (commandName === 'untimeout') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك رفع الكتم عن شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });

        await targetMember.timeout(null, reason).catch(() => {});
        
        await sendLog(guild, 'timeout', '🔊 سجل رفع الكتم (Untimeout)', 0x2ECC71, [
          { name: '👤 العضو المرفع عنه الكتم:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 السبب:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم رفع الكتم عن العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'warn') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك تحذير نفسك أو شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });

        const key = `${guild.id}_${user.id}`;
        let warns = userWarnings.get(key) || [];
        warns.push({ reason, admin: interaction.user.tag, date: Date.now() });
        userWarnings.set(key, warns);

        await sendLog(guild, 'warn', '⚠️ سجل تحذير جديد (Warn)', 0xE74C3C, [
          { name: '👤 العضو المعاقب:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 سبب العقوبة:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false },
          { name: '📊 إجمالي التحذيرات:', value: `${warns.length} تحذيرات`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم إصدار تحذير للعضو **${user.tag}** بنجاح.`, ephemeral: true });
      }

      if (commandName === 'unwarn') {
        const user = options.getUser('العضو');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (targetMember && !canPunish(member, targetMember)) {
          return interaction.reply({ content: '❌ عذراً، لا يمكنك إزالة التحذيرات عن شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });
        }

        const key = `${guild.id}_${user.id}`;
        userWarnings.delete(key);

        await sendLog(guild, 'warn', '🗑️ سجل إزالة التحذيرات (Unwarn)', 0x2ECC71, [
          { name: '👤 العضو:', value: `${user} (${user.tag})`, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم مسح كافة التحذيرات عن العضو **${user.tag}** بنجاح.`, ephemeral: true });
      }

      if (commandName === 'warnings-all') {
        const guildWarns = Array.from(userWarnings.entries())
          .filter(([key]) => key.startsWith(`${guild.id}_`));

        if (guildWarns.length === 0) {
          return interaction.reply({ content: '❌ لا توجد أي تحذيرات مسجلة في هذا السيرفر حالياً.', ephemeral: true });
        }

        let desc = '📋 **قائمة الأعضاء الذين عليهم تحذيرات في السيرفر:**\n\n';
        guildWarns.forEach(([key, warns]) => {
          const userId = key.split('_')[1];
          desc += `👤 <@${userId}> ➔ عدد التحذيرات: **${warns.length}**\n`;
          warns.forEach((w, i) => {
            desc += `   \`#${i + 1}\` السبب: ${w.reason} (بواسطة: ${w.admin})\n`;
          });
          desc += '\n';
        });

        const embed = new EmbedBuilder()
          .setTitle('⚠️ سجل كافة تحذيرات السيرفر')
          .setDescription(desc.substring(0, 4096))
          .setColor(0xE74C3C)
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'warnings-member') {
        const user = options.getUser('العضو');
        const key = `${guild.id}_${user.id}`;
        const warns = userWarnings.get(key) || [];

        if (warns.length === 0) {
          return interaction.reply({ content: `✅ العضو **${user.tag}** ليس لديه أي تحذيرات مسجلة.`, ephemeral: true });
        }

        let desc = `📋 **تحذيرات العضو ${user}:**\n\n`;
        warns.forEach((w, i) => {
          desc += `\`#${i + 1}\` السبب: **${w.reason}**\n   🛡️ بواسطة: ${w.admin} \vert{} 📅 <t:${Math.floor(w.date / 1000)}:R>\n\n`;
        });

        const embed = new EmbedBuilder()
          .setTitle(`⚠️ سجل تحذيرات: ${user.username}`)
          .setDescription(desc)
          .setColor(0xE74C3C)
          .setThumbnail(user.displayAvatarURL())
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'warnings-clear-all') {
        let count = 0;
        for (const key of userWarnings.keys()) {
          if (key.startsWith(`${guild.id}_`)) {
            userWarnings.delete(key);
            count++;
          }
        }

        await sendLog(guild, 'warn', '🗑️ حذف جميع تحذيرات السيرفر', 0xE74C3C, [
          { name: '🛡️ الإداري المسؤول:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تمت مسح وحذف جميع التحذيرات في السيرفر بنجاح (تمت إزالة سجلات ${count} عضو).`, ephemeral: true });
      }

      if (commandName === 'azkar-setup') {
        const targetChannel = options.getChannel('القناة');
        const hours = options.getInteger('الساعات');
        
        azkarSettings.set(guild.id, {
          channelId: targetChannel.id,
          intervalHours: hours,
          lastSent: Date.now()
        });

        const embed = new EmbedBuilder()
          .setTitle('📿 تم إعداد نظام الأذكار بنجاح!')
          .setDescription(`سيتم إرسال الأذكار تلقائياً في القناة ${targetChannel} كل **${hours} ساعات**.`)
          .setColor(0x2ECC71);

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'azkar') {
        const randomZikr = azkarList[Math.floor(Math.random() * azkarList.length)];
        const embed = new EmbedBuilder()
          .setTitle('📿 ذِكْرُ الله')
          .setDescription(`> **${randomZikr}**`)
          .setColor(0xE74C3C)
          .setFooter({ text: `طلب بواسطة ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'admin-setup') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('🛡️ لوحة التحكم بصلاحيات الأوامر الإدارية')
          .setDescription('اختر الأمر الإداري لتحديد رتبة معينة لاستخدامه:')
          .setColor(0xE74C3C);

        const menu = new StringSelectMenuBuilder()
          .setCustomId('select_admin_command')
          .setPlaceholder('اختر الأمر الإداري...')
          .addOptions(
            { label: 'حظر العضو (Ban)', value: 'ban', emoji: '🔨' },
            { label: 'طرد العضو (Kick)', value: 'kick', emoji: '👢' },
            { label: 'كتم مؤقت (Timeout)', value: 'timeout', emoji: '⏰' },
            { label: 'تحذير إداري (Warn)', value: 'warn', emoji: '⚠️' }
          );

        return interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
      }

      if (commandName === 'level-setup') {
        await interaction.deferReply({ ephemeral: true });
        const currentLvlSet = levelSettings.get(guild.id) || { enabled: false, xpPerMessage: 15, voiceXpEnabled: true };
        
        const toggleBtnLabel = currentLvlSet.enabled ? 'إيقاف نظام اللفلات 🛑' : 'تفعيل نظام اللفلات ✅';
        const toggleBtnStyle = currentLvlSet.enabled ? ButtonStyle.Danger : ButtonStyle.Success;

        const embed = new EmbedBuilder()
          .setTitle('⭐ لوحة إعدادات نظام اللفلات (Levels & XP)')
          .setDescription(`حالة النظام الحالي: **${currentLvlSet.enabled ? '🟢 مفعل' : '🔴 متوقف'}**\nقيمة XP الرسالة الواحدة: **${currentLvlSet.xpPerMessage} XP**\nكسب XP من الرومات الصوتية: **${currentLvlSet.voiceXpEnabled ? '✅ مفعل' : '❌ متوقف'}**\n📈 *معلومة: متطلبات الـ XP تزداد بنسبة 20% لكل لفل.*`)
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_system').setLabel(toggleBtnLabel).setStyle(toggleBtnStyle),
          new ButtonBuilder().setCustomId('lvl_set_xp_amount').setLabel('تحديد XP الرسالة الواحدة ✍️').setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_voice').setLabel(currentLvlSet.voiceXpEnabled ? 'إيقاف تفاعل الصوت 🎙️' : 'تشغيل تفاعل الصوت 🎙️').setStyle(ButtonStyle.Secondary)
        );

        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
      }

      if (commandName === 'level') {
        await interaction.deferReply();
        const targetUser = options.getUser('العضو') || interaction.user;
        const key = `${guild.id}_${targetUser.id}`;
        const userData = userLevels.get(key) || { xp: 0, level: 0 };
        const nextLevelXp = getRequiredXp(userData.level);

        try {
          const canvas = createCanvas(800, 260);
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = '#0f0f12';
          ctx.beginPath();
          ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
          ctx.fill();

          ctx.fillStyle = '#1e1e24';
          ctx.beginPath();
          ctx.roundRect(240, 175, 510, 28, 14);
          ctx.fill();

          const percentage = Math.min(userData.xp / nextLevelXp, 1);
          const progressWidth = Math.max(percentage * 510, 28);
          
          const redGradient = ctx.createLinearGradient(240, 0, 750, 0);
          redGradient.addColorStop(0, '#ff2a2a');
          redGradient.addColorStop(1, '#990000');
          
          ctx.fillStyle = redGradient;
          ctx.beginPath();
          ctx.roundRect(240, 175, progressWidth, 28, 14);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px sans-serif';
          ctx.fillText(targetUser.username, 240, 65);

          ctx.fillStyle = '#ff4d4d';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(`LEVEL: ${userData.level}`, 240, 110);

          ctx.fillStyle = '#cccccc';
          ctx.font = '18px sans-serif';
          ctx.fillText(`XP: ${userData.xp} /${nextLevelXp}`, 400, 110);

          ctx.save();
          ctx.beginPath();
          ctx.arc(120, 130, 72, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();

          const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
          const avatar = await loadImage(avatarURL);
          ctx.drawImage(avatar, 48, 58, 144, 144);
          ctx.restore();

          const attachment = { attachment: canvas.toBuffer('image/png'), name: 'rank-card.png' };
          return interaction.editReply({ files: [attachment] });
        } catch (err) {
          console.error(err);
          return interaction.editReply({ content: `❌ حدث خطأ أثناء إنشاء بطاقة اللفل.` });
        }
      }

      if (commandName === 'ping') return interaction.reply({ content: `🏓 السرعة: **${client.ws.ping}ms**`, ephemeral: true });

      if (commandName === 'avatar') {
        const user = options.getUser('العضو') || interaction.user;
        const embed = new EmbedBuilder().setTitle(`🖼️ صورة ${user.username}`).setImage(user.displayAvatarURL({ dynamic: true, size: 1024 })).setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'user-info') {
        const user = options.getUser('العضو') || interaction.user;
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        const embed = new EmbedBuilder()
          .setTitle(`👤 معلومات: ${user.username}`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: '🆔 الايدي:', value: user.id, inline: true },
            { name: '📅 إنشاء الحساب:', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '📥 الانضمام:', value: targetMember ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'غير معروف', inline: true }
          )
          .setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'server-info') {
        const embed = new EmbedBuilder()
          .setTitle(`🏰 سيرفر: ${guild.name}`)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: '👑 المالك:', value: `<@${guild.ownerId}>`, inline: true },
            { name: '👥 الأعضاء:', value: `${guild.memberCount}`, inline: true },
            { name: '💬 الرومات:', value: `${guild.channels.cache.size}`, inline: true }
          )
          .setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'clear') {
        const amount = options.getInteger('العدد');
        if (amount < 1 || amount > 100) return interaction.reply({ content: '❌ اختر عدداً بين 1 و 100.', ephemeral: true });
        await channel.bulkDelete(amount, true).catch(() => {});
        return interaction.reply({ content: `🧹 تم مسح **${amount}** رسالة.`, ephemeral: true });
      }

      if (commandName === 'lock') {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
        return interaction.reply({ content: '🔒 **تم قفل الروم الحالية.**' });
      }
      if (commandName === 'unlock') {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
        return interaction.reply({ content: '🔓 **تم فتح الروم الحالية.**' });
      }

      // **تحديث أمر ticket-setup** (إضافة أزرار لون الزر ولون البانل وإزالة سجل التكت منه)
      if (commandName === 'ticket-setup') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('🎫 إعدادات نظام التذاكر (Tickets)')
          .setDescription('قم بتعديل العنوان، الوصف، ألوان البانل والأزرار، ثم قم بإرسال اللوحة عبر الأزرار أدناه:')
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tk_edit_panel').setLabel('تعديل عنوان ووصف الـ Panel').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tk_set_button_color').setLabel('تحديد لون الزر 🎨').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('tk_set_embed_color').setLabel('تحديد لون البانل 🌈').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tk_send_embed').setLabel('إرسال ونشر اللوحة 🚀').setStyle(ButtonStyle.Success)
        );

        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
      }

      if (commandName === 'تقديم') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('📂 لوحة إدارة التقديمات الأربعة المطورة')
          .setDescription('اختر التقديم لتعديل اسم التقديم والبانر، تعيين الـ 5 أسئلة، رتبة القبول، وروم استقبال الطلبات:')
          .setColor(0xE74C3C);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('app_cfg_1').setLabel('تقديم (1)').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('app_cfg_2').setLabel('تقديم (2)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('app_cfg_3').setLabel('تقديم (3)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('app_cfg_4').setLabel('تقديم (4)').setStyle(ButtonStyle.Primary)
        );
        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'logs') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder().setTitle('📑 إعداد السجلات الشاملة').setDescription('اختر نوع السجل وتحديد قناته (سجل التكت متوفر هنا):').setColor(0xE74C3C);
        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('set_log_ban').setLabel('سجل الباند 🔨').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('set_log_kick').setLabel('سجل الطرد 👢').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('set_log_timeout').setLabel('سجل التايم ⏰').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('set_log_warn').setLabel('سجل التحذير ⚠️').setStyle(ButtonStyle.Secondary)
        );
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('set_log_jail').setLabel('سجل السجن ⛓️').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('set_log_ticket').setLabel('سجل التكت 🎫').setStyle(ButtonStyle.Success)
        );
        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
      }

      if (commandName === 'afk') {
        const reason = options.getString('سبب') || 'لا يوجد سبب';
        afkUsers.set(interaction.user.id, { reason, timestamp: Date.now() });
        return interaction.reply({ content: `💤 تم تفعيل وضع AFK. السبب: **${reason}**` });
      }

      if (commandName === 'ban') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (targetMember && !canPunish(member, targetMember)) {
          return interaction.reply({ content: '❌ عذراً، لا يمكنك حظر نفسك أو شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });
        }

        await guild.members.ban(user.id, { reason });
        
        await sendLog(guild, 'ban', '🔨 سجل حظر جديد (Ban)', 0xE74C3C, [
          { name: '👤 العضو المعاقب:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 سبب العقوبة:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم حظر العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'kick') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك طرد نفسك أو شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });

        await targetMember.kick(reason);

        await sendLog(guild, 'kick', '👢 سجل طرد جديد (Kick)', 0xE74C3C, [
          { name: '👤 العضو المعاقب:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 سبب العقوبة:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم طرد العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'timeout') {
        const user = options.getUser('العضو');
        const duration = options.getInteger('المدة');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك كتم نفسك أو شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });

        await targetMember.timeout(duration, reason);

        await sendLog(guild, 'timeout', '⏰ سجل كتم مؤقت (Timeout)', 0xE74C3C, [
          { name: '👤 العضو المعاقب:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 سبب العقوبة:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم كتم العضو **${user.tag}**.`, ephemeral: true });
      }
    }

    if (interaction.isRoleSelectMenu()) {
      if (interaction.customId === 'jail_set_role') {
        const roleId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.roleId = roleId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد رتبة السجين: <@&${roleId}>`, ephemeral: true });
      }

      if (interaction.customId === 'jail_set_jailer_role') {
        const roleId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.jailerRoleId = roleId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد رتبة السجان: <@&${roleId}>`, ephemeral: true });
      }

      if (interaction.customId.startsWith('app_set_role_menu_')) {
        const appNum = interaction.customId.replace('app_set_role_menu_', '');
        const roleId = interaction.values[0];
        const key = `${interaction.guild.id}_${appNum}`;
        let data = applicationsData.get(key) || {};
        data.roleId = roleId;
        applicationsData.set(key, data);
        return interaction.reply({ content: `✅ تم تحديد رتبة القبول للتقديم (${appNum}) بنجاح: <@&${roleId}>`, ephemeral: true });
      }
    }

    if (interaction.isChannelSelectMenu()) {
      const id = interaction.customId;
      if (id.startsWith('select_channel_')) {
        const logType = id.replace('select_channel_', '');
        const selectedChannelId = interaction.values[0];
        if (!logChannels.has(interaction.guild.id)) logChannels.set(interaction.guild.id, {});
        logChannels.get(interaction.guild.id)[logType] = selectedChannelId;
        return interaction.reply({ content: `✅ تم تحديد قناة (${logType.toUpperCase()}) بنجاح!`, ephemeral: true });
      }

      if (id === 'jail_set_text_channel') {
        const channelId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.textChannelId = channelId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد روم كتابة السجناء: <#${channelId}>`, ephemeral: true });
      }

      if (id === 'jail_set_log_channel') {
        const channelId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.logChannelId = channelId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد قناة سجل السجن: <#${channelId}>`, ephemeral: true });
      }

      if (id.startsWith('app_set_channel_menu_')) {
        const appNum = interaction.customId.replace('app_set_channel_menu_', '');
        const channelId = interaction.values[0];
        const key = `${interaction.guild.id}_${appNum}`;
        let data = applicationsData.get(key) || {};
        data.logChannelId = channelId;
        applicationsData.set(key, data);
        return interaction.reply({ content: `✅ تم تحديد روم وصول طلبات التقديم (${appNum}) بنجاح: <#${channelId}>`, ephemeral: true });
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'sc_select_command_menu') {
        const selectedOrigCmd = interaction.values[0];
        const modal = new ModalBuilder()
          .setCustomId(`sc_modal_save_${selectedOrigCmd}`)
          .setTitle(`إنشاء اختصار لـ /${selectedOrigCmd}`);

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('shortcut_alias_input')
              .setLabel('اكتب الاختصار (مثلاً: b أو k)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
        return await interaction.showModal(modal);
      }
    }

    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === 'lvl_toggle_system') {
        let currentLvlSet = levelSettings.get(interaction.guild.id) || { enabled: false, xpPerMessage: 15, voiceXpEnabled: true };
        currentLvlSet.enabled = !currentLvlSet.enabled;
        levelSettings.set(interaction.guild.id, currentLvlSet);

        const toggleBtnLabel = currentLvlSet.enabled ? 'إيقاف نظام اللفلات 🛑' : 'تفعيل نظام اللفلات ✅';
        const toggleBtnStyle = currentLvlSet.enabled ? ButtonStyle.Danger : ButtonStyle.Success;

        const embed = new EmbedBuilder()
          .setTitle('⭐ لوحة إعدادات نظام اللفلات (Levels & XP)')
          .setDescription(`حالة النظام الحالي: **${currentLvlSet.enabled ? '🟢 مفعل' : '🔴 متوقف'}**\nقيمة XP الرسالة الواحدة: **${currentLvlSet.xpPerMessage} XP**\nكسب XP من الرومات الصوتية: **${currentLvlSet.voiceXpEnabled ? '✅ مفعل' : '❌ متوقف'}**\n📈 *متطلبات الـ XP تزداد بنسبة 20% لكل لفل.*`)
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_system').setLabel(toggleBtnLabel).setStyle(toggleBtnStyle),
          new ButtonBuilder().setCustomId('lvl_set_xp_amount').setLabel('تحديد XP الرسالة الواحدة ✍️').setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_voice').setLabel(currentLvlSet.voiceXpEnabled ? 'إيقاف تفاعل الصوت 🎙️' : 'تشغيل تفاعل الصوت 🎙️').setStyle(ButtonStyle.Secondary)
        );

        return interaction.update({ embeds: [embed], components: [row1, row2] });
      }

      if (id === 'lvl_set_xp_amount') {
        const modal = new ModalBuilder().setCustomId('lvl_modal_set_xp').setTitle('تحديد مقدار الـ XP للرسالة الواحدة');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('xp_amount_input')
              .setLabel('اكتب عدد نقاط XP (مثلاً: 15 أو 20)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
        return await interaction.showModal(modal);
      }

      if (id === 'lvl_toggle_voice') {
        let currentLvlSet = levelSettings.get(interaction.guild.id) || { enabled: false, xpPerMessage: 15, voiceXpEnabled: true };
        currentLvlSet.voiceXpEnabled = !currentLvlSet.voiceXpEnabled;
        levelSettings.set(interaction.guild.id, currentLvlSet);

        const toggleBtnLabel = currentLvlSet.enabled ? 'إيقاف نظام اللفلات 🛑' : 'تفعيل نظام اللفلات ✅';
        const toggleBtnStyle = currentLvlSet.enabled ? ButtonStyle.Danger : ButtonStyle.Success;

        const embed = new EmbedBuilder()
          .setTitle('⭐ لوحة إعدادات نظام اللفلات (Levels & XP)')
          .setDescription(`حالة النظام الحالي: **${currentLvlSet.enabled ? '🟢 مفعل' : '🔴 متوقف'}**\nقيمة XP الرسالة الواحدة: **${currentLvlSet.xpPerMessage} XP**\nكسب XP من الرومات الصوتية: **${currentLvlSet.voiceXpEnabled ? '✅ مفعل' : '❌ متوقف'}**\n📈 *متطلبات الـ XP تزداد بنسبة 20% لكل لفل.*`)
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_system').setLabel(toggleBtnLabel).setStyle(toggleBtnStyle),
          new ButtonBuilder().setCustomId('lvl_set_xp_amount').setLabel('تحديد XP الرسالة الواحدة ✍️').setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_voice').setLabel(currentLvlSet.voiceXpEnabled ? 'إيقاف تفاعل الصوت 🎙️' : 'تشغيل تفاعل الصوت 🎙️').setStyle(ButtonStyle.Secondary)
        );

        return interaction.update({ embeds: [embed], components: [row1, row2] });
      }

      if (id === 'bw_add_word') {
        const modal = new ModalBuilder().setCustomId('bw_modal_add').setTitle('إضافة كلمة ممنوعة جديدة');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('word_input').setLabel('اكتب الكلمة المراد حظرها').setStyle(TextInputStyle.Short).setRequired(true)));
        return await interaction.showModal(modal);
      }

      if (id === 'bw_list_words') {
        const wordsSet = badWordsDB.get(interaction.guild.id) || new Set();
        if (wordsSet.size === 0) return interaction.reply({ content: '❌ لا توجد أي كلمات ممنوعة مسجلة حالياً.', ephemeral: true });
        const wordsArray = Array.from(wordsSet).map((w, index) => `${index + 1}. \`${w}\``).join('\n');
        const embed = new EmbedBuilder().setTitle('📋 قائمة الكلمات المحظورة').setDescription(wordsArray).setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (id === 'bw_set_punishment') {
        const embed = new EmbedBuilder().setTitle('⚖️ تحديد العقوبة التلقائية للكلمات الممنوعة').setDescription('اختر العقوبة المناسبة من الأزرار أدناه:').setColor(0xE74C3C);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_pun_delete').setLabel('حذف الرسالة').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('bw_pun_timeout').setLabel('كتم العضو').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('bw_pun_kick').setLabel('طرد العضو').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('bw_pun_ban').setLabel('حظر العضو').setStyle(ButtonStyle.Danger)
        );
        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }

      if (id.startsWith('bw_pun_')) {
        const punType = id.replace('bw_pun_', '');
        badWordsPunishment.set(interaction.guild.id, punType);
        return interaction.reply({ content: `✅ تم تحديث عقوبة الكلمات الممنوعة إلى: **${punType.toUpperCase()}**`, ephemeral: true });
      }

      if (id === 'bw_remove_word') {
        const modal = new ModalBuilder().setCustomId('bw_modal_remove').setTitle('إزالة كلمة من القائمة');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('word_remove_input').setLabel('اكتب الكلمة المراد إزالتها').setStyle(TextInputStyle.Short).setRequired(true)));
        return await interaction.showModal(modal);
      }

      if (id === 'bw_clear_all') {
        badWordsDB.set(interaction.guild.id, new Set());
        badWordsPunishment.set(interaction.guild.id, 'delete');
        return interaction.reply({ content: '🗑️ تم إفراغ وإلغاء جميع الكلمات المحظورة.', ephemeral: true });
      }

      if (id === 'sc_create') {
        const embed = new EmbedBuilder().setTitle('🔗 اختيار الأمر لعمل اختصار له').setDescription('اختر الأمر الإداري من القائمة أدناه:').setColor(0xE74C3C);
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('sc_select_command_menu')
          .setPlaceholder('اختر الأمر الإداري...')
          .addOptions(
            { label: 'حظر (ban)', value: 'ban', emoji: '🔨' },
            { label: 'طرد (kick)', value: 'kick', emoji: '👢' },
            { label: 'كتم مؤقت (timeout)', value: 'timeout', emoji: '⏰' },
            { label: 'رفع الكتم (untimeout)', value: 'untimeout', emoji: '🔊' },
            { label: 'تحذير (warn)', value: 'warn', emoji: '⚠️' },
            { label: 'سجن (jail)', value: 'jail', emoji: '⛓️' },
            { label: 'إفراج السجن (unjail)', value: 'unjail', emoji: '🔓' },
            { label: 'مسح رسائل (clear)', value: 'clear', emoji: '🧹' }
          );
        return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
      }

      if (id === 'sc_list') {
        const guildShortcuts = Array.from(customShortcuts.entries()).filter(([k]) => k.startsWith(interaction.guild.id));
        if (guildShortcuts.length === 0) return interaction.reply({ content: '❌ لا توجد أي اختصارات مسجلة.', ephemeral: true });

        const listText = guildShortcuts.map(([key, orig]) => {
          const alias = key.replace(`${interaction.guild.id}_`, '');
          return `🔹 الاختصار: \`!${alias}\` ➡️ الأمر: \`/${orig}\``;
        }).join('\n');

        const embed = new EmbedBuilder().setTitle('📜 قائمة الاختصارات النشطة').setDescription(listText).setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (id === 'sc_delete') {
        const modal = new ModalBuilder().setCustomId('sc_modal_delete_alias').setTitle('حذف اختصار');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('alias_to_delete').setLabel('اكتب اسم الاختصار المراد حذفه').setStyle(TextInputStyle.Short).setRequired(true)));
        return await interaction.showModal(modal);
      }

      if (id === 'prot_toggle_links') {
        let current = protectionSettings.get(interaction.guild.id) || { antiSpam: false, antiLinks: false };
        current.antiLinks = !current.antiLinks;
        protectionSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `🛡️ تم **${current.antiLinks ? 'تفعيل' : 'إيقاف'}** حماية الروابط.`, ephemeral: true });
      }

      if (id === 'prot_toggle_spam') {
        let current = protectionSettings.get(interaction.guild.id) || { antiSpam: false, antiLinks: false };
        current.antiSpam = !current.antiSpam;
        protectionSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `⚡ تم **${current.antiSpam ? 'تفعيل' : 'إيقاف'}** حماية السبام.`, ephemeral: true });
      }

      if (id === 'tk_edit_panel') {
        const modal = new ModalBuilder().setCustomId('save_ticket_panel').setTitle('تعديل عنوان ووصف الـ Panel');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tk_title').setLabel('عنوان التذكرة الرئيسي').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tk_desc').setLabel('الوصف / النص الداخلي').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        return await interaction.showModal(modal);
      }

      // زر تحديد لون الزر (يظهر قائمة أو مودال لتحديد نمط أو لون الزر)
      if (id === 'tk_set_button_color') {
        const modal = new ModalBuilder().setCustomId('save_ticket_button_style').setTitle('تحديد لون ونمط زر التكت');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('tk_btn_style_input')
              .setLabel('اختر النمط: primary, success, danger, secondary')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
        return await interaction.showModal(modal);
      }

      // زر تحديد لون البانل
      if (id === 'tk_set_embed_color') {
        const modal = new ModalBuilder().setCustomId('save_ticket_embed_color').setTitle('تحديد لون البانل (Hex Color)');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('tk_embed_color_input')
              .setLabel('اكتب كود اللون (مثلاً: #E74C3C أو 0xE74C3C)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
        return await interaction.showModal(modal);
      }

      if (id === 'tk_send_embed') {
        const data = ticketData.get(interaction.guild.id);
        if (!data || !data.title) return interaction.reply({ content: '❌ يرجى تعديل عنوان ووصف الـ panel أولاً!', ephemeral: true });

        const embedColor = data.embedColor || 0xE74C3C;
        const btnStyleChoice = data.buttonStyle || ButtonStyle.Danger;

        const embed = new EmbedBuilder()
          .setTitle(data.title)
          .setDescription(data.desc || 'اضغط على الزر أدناه لفتح تذكرة جديدة.')
          .setColor(embedColor);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('create_ticket_btn')
            .setLabel('فتح تذكرة')
            .setEmoji('🎫')
            .setStyle(btnStyleChoice)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: '🚀 تم نشر لوحة التذاكر بنجاح!', ephemeral: true });
      }

      if (id === 'create_ticket_btn') {
        const modal = new ModalBuilder().setCustomId('ticket_reason_modal').setTitle('التذكرة');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_reason_input').setLabel('وضح طلبك باختصار:').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        return await interaction.showModal(modal);
      }

      if (id === 'close_ticket') {
        await interaction.reply({ content: '🔒 جاري إغلاق التذكرة...', ephemeral: true });
        await interaction.channel.delete().catch(() => {});
      }

      if (id.startsWith('app_cfg_')) {
        const appNum = id.replace('app_cfg_', '');
        const embed = new EmbedBuilder()
          .setTitle(`⚙️ إعدادات التقديم رقم (${appNum}) المطورة`)
          .setDescription('اختر الإجراء المناسب لإعداد اسم التقديم والبانر، أو تعيين الـ 5 أسئلة، رتبة القبول، أو روم الاستقبال:')
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`app_edit_name_banner_${appNum}`).setLabel('اسم التقديم والبانر 🏷️').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`app_edit_5_questions_${appNum}`).setLabel('إعداد الـ 5 أسئلة 📝').setStyle(ButtonStyle.Success)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`app_set_role_btn_${appNum}`).setLabel('تحديد رتبة القبول 🏷️').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`app_set_channel_btn_${appNum}`).setLabel('تحديد روم وصول الطلبات 📬').setStyle(ButtonStyle.Secondary)
        );

        const row3 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`app_send_room_${appNum}`).setLabel('نشر لوحة التقديم 📤').setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({ embeds: [embed], components: [row1, row2, row3], ephemeral: true });
      }

      if (id.startsWith('app_edit_name_banner_')) {
        const appNum = id.replace('app_edit_name_banner_', '');
        const modal = new ModalBuilder().setCustomId(`save_name_banner_${appNum}`).setTitle(`إعداد اسم وبانر تقديم (${appNum})`);
        
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_name').setLabel('اسم التقديم (مثلاً: تقديم الإدارة)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_banner').setLabel('رابط بانر التقديم (Image URL - اختياري)').setStyle(TextInputStyle.Short).setRequired(false))
        );
        return await interaction.showModal(modal);
      }

      if (id.startsWith('app_edit_5_questions_')) {
        const appNum = id.replace('app_edit_5_questions_', '');
        const modal = new ModalBuilder().setCustomId(`save_5_questions_${appNum}`).setTitle(`إعداد الأسئلة الخمسة لتقديم (${appNum})`);
        
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q1_input').setLabel('السؤال الأول (1)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q2_input').setLabel('السؤال الثاني (2)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q3_input').setLabel('السؤال الثالث (3)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q4_input').setLabel('السؤال الرابع (4)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q5_input').setLabel('السؤال الخامس (5)').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await interaction.showModal(modal);
      }

      if (id.startsWith('app_set_role_btn_')) {
        const appNum = id.replace('app_set_role_btn_', '');
        const roleMenu = new RoleSelectMenuBuilder().setCustomId(`app_set_role_menu_${appNum}`).setPlaceholder(`اختر رتبة القبول للتقديم (${appNum})...`);
        return interaction.reply({ content: `🏷️ اختر رتبة القبول التي سيحصل عليها العضو عند الموافقة عليه في التقديم (${appNum}):`, components: [new ActionRowBuilder().addComponents(roleMenu)], ephemeral: true });
      }

      if (id.startsWith('app_set_channel_btn_')) {
        const appNum = id.replace('app_set_channel_btn_', '');
        const channelMenu = new ChannelSelectMenuBuilder().setCustomId(`app_set_channel_menu_${appNum}`).setPlaceholder(`اختر روم وصول طلبات تقديم (${appNum})...`).addChannelTypes(ChannelType.GuildText);
        return interaction.reply({ content: `📬 اختر الروم التي ستصل إليها طلبات المتقدمين مع أزرار (أوافق / أرفق):`, components: [new ActionRowBuilder().addComponents(channelMenu)], ephemeral: true });
      }

      if (id.startsWith('app_send_room_')) {
        const appNum = id.replace('app_send_room_', '');
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`);
        if (!data || !data.name) return interaction.reply({ content: '❌ يرجى ضبط اسم التقديم والأسئلة أولاً!', ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle(`📋 ${data.name}`)
          .setDescription('اضغط على الزر أدناه لفتح نموذج التقديم والإجابة على الأسئلة الـ 5:')
          .setColor(0xE74C3C);

        if (data.banner && data.banner.startsWith('http')) {
          embed.setImage(data.banner);
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`start_apply_${appNum}`).setLabel(`تقديم الان`).setEmoji('📝').setStyle(ButtonStyle.Danger)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: `✅ تم نشر لوحة (${data.name}) في هذه الروم بنجاح!`, ephemeral: true });
      }

      if (id.startsWith('start_apply_')) {
        const appNum = id.replace('start_apply_', '');
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`);
        if (!data || !data.q1) return interaction.reply({ content: '❌ عذراً، هذا التقديم غير مُكتمل الأسئلة بعد.', ephemeral: true });

        const modal = new ModalBuilder().setCustomId(`submit_apply_modal_${appNum}`).setTitle((data.name || 'تقديم').substring(0, 45));
        
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q_ans_1').setLabel(data.q1.substring(0, 45)).setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q_ans_2').setLabel(data.q2.substring(0, 45)).setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q_ans_3').setLabel(data.q3.substring(0, 45)).setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q_ans_4').setLabel(data.q4 ? data.q4.substring(0, 45) : 'السؤال الرابع').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q_ans_5').setLabel(data.q5 ? data.q5.substring(0, 45) : 'السؤال الخامس').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await interaction.showModal(modal);
      }

      if (id.startsWith('app_accept_') || id.startsWith('app_reject_')) {
        const isAccept = id.startsWith('app_accept_');
        const parts = id.split('_'); 
        const appNum = parts[2];
        const targetUserId = parts[3];

        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`) || {};

        if (isAccept) {
          if (targetMember && data.roleId) {
            await targetMember.roles.add(data.roleId).catch(() => {});
          }

          const oldEmbed = interaction.message.embeds[0];
          const newEmbed = EmbedBuilder.from(oldEmbed)
            .setColor(0x2ECC71)
            .addFields({ name: '📊 حالة الطلب:', value: `✅ **تم القبول بواسطة** ${interaction.user}`, inline: false });

          await interaction.update({ embeds: [newEmbed], components: [] });
          
          if (targetMember) {
            targetMember.send(`🎉 مبارك يا عمرو! لقد تم **قبول** تقديمك في **${data.name || 'التقديم'}** وحصلت على الرتبة المخصصة.`).catch(() => {});
          }
        } else {
          const oldEmbed = interaction.message.embeds[0];
          const newEmbed = EmbedBuilder.from(oldEmbed)
            .setColor(0xE74C3C)
            .addFields({ name: '📊 حالة الطلب:', value: `❌ **تم الرفض بواسطة** ${interaction.user}`, inline: false });

          await interaction.update({ embeds: [newEmbed], components: [] });

          if (targetMember) {
            targetMember.send(`⚠️ نأسف لك، لقد تم **رفض** تقديمك في **${data.name || 'التقديم'}**.`).catch(() => {});
          }
        }
        return;
      }

      if (id.startsWith('set_log_')) {
        const logType = id.replace('set_log_', '');
        const selectMenu = new ChannelSelectMenuBuilder().setCustomId(`select_channel_${logType}`).setPlaceholder('اختر الروم المخصصة للسجل...').addChannelTypes(ChannelType.GuildText);
        return interaction.reply({ content: `📌 اختر القناة الخاصة بـ (${logType.toUpperCase()}):`, components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'lvl_modal_set_xp') {
        const val = parseInt(interaction.fields.getTextInputValue('xp_amount_input'));
        if (isNaN(val) || val <= 0) return interaction.reply({ content: '❌ يرجى إدخال رقم صحيح أكبر من صفر.', ephemeral: true });

        let currentLvlSet = levelSettings.get(interaction.guild.id) || { enabled: false, xpPerMessage: 15, voiceXpEnabled: true };
        currentLvlSet.xpPerMessage = val;
        levelSettings.set(interaction.guild.id, currentLvlSet);

        return interaction.reply({ content: `✅ تم تحديث نقاط XP الرسالة الواحدة لتصبح **${val} XP**.`, ephemeral: true });
      }

      if (interaction.customId === 'bw_modal_add') {
        const newWord = interaction.fields.getTextInputValue('word_input').trim().toLowerCase();
        let wordsSet = badWordsDB.get(interaction.guild.id) || new Set();
        wordsSet.add(newWord);
        badWordsDB.set(interaction.guild.id, wordsSet);
        return interaction.reply({ content: `✅ تم إضافة الكلمة \`${newWord}\` للقائمة بنجاح!`, ephemeral: true });
      }

      if (interaction.customId === 'bw_modal_remove') {
        const wordToRemove = interaction.fields.getTextInputValue('word_remove_input').trim().toLowerCase();
        let wordsSet = badWordsDB.get(interaction.guild.id) || new Set();
        if (wordsSet.has(wordToRemove)) {
          wordsSet.delete(wordToRemove);
          badWordsDB.set(interaction.guild.id, wordsSet);
          return interaction.reply({ content: `✅ تم إزالة الكلمة \`${wordToRemove}\`.`, ephemeral: true });
        }
        return interaction.reply({ content: `❌ الكلمة غير موجودة.`, ephemeral: true });
      }

      if (interaction.customId.startsWith('sc_modal_save_')) {
        const origCmd = interaction.customId.replace('sc_modal_save_', '');
        const alias = interaction.fields.getTextInputValue('shortcut_alias_input').toLowerCase().trim().replace('!', '');
        customShortcuts.set(`${interaction.guild.id}_${alias}`, origCmd);
        return interaction.reply({ content: `⚡ تم إنشاء الاختصار بنجاح! \`!${alias}\` تنفذ الأمر \`/${origCmd}\`.`, ephemeral: true });
      }

      if (interaction.customId === 'sc_modal_delete_alias') {
        const alias = interaction.fields.getTextInputValue('alias_to_delete').toLowerCase().trim().replace('!', '');
        const key = `${interaction.guild.id}_${alias}`;
        if (customShortcuts.has(key)) {
          customShortcuts.delete(key);
          return interaction.reply({ content: `✅ تم حذف الاختصار \`!${alias}\`.`, ephemeral: true });
        }
        return interaction.reply({ content: `❌ الاختصار غير موجود.`, ephemeral: true });
      }

      if (interaction.customId === 'save_ticket_panel') {
        const title = interaction.fields.getTextInputValue('tk_title');
        const desc = interaction.fields.getTextInputValue('tk_desc');
        
        let data = ticketData.get(interaction.guild.id) || {};
        data.title = title;
        data.desc = desc;
        ticketData.set(interaction.guild.id, data);

        return interaction.reply({ content: '✅ تم حفظ عنوان ووصف لوحة التذاكر بنجاح!', ephemeral: true });
      }

      // حفظ نمط وزر التكت
      if (interaction.customId === 'save_ticket_button_style') {
        const styleInput = interaction.fields.getTextInputValue('tk_btn_style_input').trim().toLowerCase();
        let style = ButtonStyle.Danger; // الافتراضي
        if (styleInput.includes('primary') || styleInput.includes('1')) style = ButtonStyle.Primary;
        else if (styleInput.includes('success') || styleInput.includes('3')) style = ButtonStyle.Success;
        else if (styleInput.includes('secondary') || styleInput.includes('2')) style = ButtonStyle.Secondary;
        else if (styleInput.includes('danger') || styleInput.includes('4')) style = ButtonStyle.Danger;

        let data = ticketData.get(interaction.guild.id) || {};
        data.buttonStyle = style;
        ticketData.set(interaction.guild.id, data);

        return interaction.reply({ content: `✅ تم تحديث لون ونمط زر التكت بنجاح.`, ephemeral: true });
      }

      // حفظ لون البانل (Embed)
      if (interaction.customId === 'save_ticket_embed_color') {
        let colorInput = interaction.fields.getTextInputValue('tk_embed_color_input').trim();
        if (colorInput.startsWith('#')) colorInput = colorInput.replace('#', '0x');
        else if (!colorInput.startsWith('0x')) colorInput = '0x' + colorInput;

        const colorNum = parseInt(colorInput);
        if (isNaN(colorNum)) return interaction.reply({ content: '❌ كود اللون غير صحيح. يرجى إدخال كود هيكس صحيح (مثل #E74C3C).', ephemeral: true });

        let data = ticketData.get(interaction.guild.id) || {};
        data.embedColor = colorNum;
        ticketData.set(interaction.guild.id, data);

        return interaction.reply({ content: `✅ تم تحديث لون بانل التذاكر بنجاح!`, ephemeral: true });
      }

      if (interaction.customId === 'ticket_reason_modal') {
        const reason = interaction.fields.getTextInputValue('ticket_reason_input');
        const guild = interaction.guild;
        const user = interaction.user;

        const channel = await guild.channels.create({
          name: `ticket-${user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
          ]
        }).catch(() => null);

        if (!channel) return interaction.reply({ content: '❌ حدث خطأ أثناء إنشاء روم التذكرة.', ephemeral: true });

        const ticketEmbed = new EmbedBuilder()
          .setTitle(`🎫 تذكرة جديدة من ${user.tag}`)
          .setDescription(`**سبب التذكرة:** ${reason}`)
          .setColor(0xE74C3C)
          .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التذكرة').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `${user}`, embeds: [ticketEmbed], components: [closeRow] });

        // إرسال سجل التكت إلى روم السجلات المحددة مسبقاً عبر أمر /logs
        await sendLog(guild, 'ticket', '🎫 سجل فتح تذكرة جديدة', 0x2ECC71, [
          { name: '👤 صاحب التذكرة:', value: `${user} (${user.tag})`, inline: false },
          { name: '💬 الروم:', value: `${channel}`, inline: false },
          { name: '📝 السبب:', value: reason, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم فتح تذكرتك بنجاح: ${channel}`, ephemeral: true });
      }

      if (interaction.customId.startsWith('save_name_banner_')) {
        const appNum = interaction.customId.replace('save_name_banner_', '');
        const appName = interaction.fields.getTextInputValue('app_name');
        const appBanner = interaction.fields.getTextInputValue('app_banner');
        
        const key = `${interaction.guild.id}_${appNum}`;
        let data = applicationsData.get(key) || {};
        data.name = appName;
        data.banner = appBanner;
        applicationsData.set(key, data);

        return interaction.reply({ content: `✅ تم حفظ اسم وبانر التقديم (${appNum}) بنجاح!`, ephemeral: true });
      }

      if (interaction.customId.startsWith('save_5_questions_')) {
        const appNum = interaction.customId.replace('save_5_questions_', '');
        const q1 = interaction.fields.getTextInputValue('q1_input');
        const q2 = interaction.fields.getTextInputValue('q2_input');
        const q3 = interaction.fields.getTextInputValue('q3_input');
        const q4 = interaction.fields.getTextInputValue('q4_input');
        const q5 = interaction.fields.getTextInputValue('q5_input');
        
        const key = `${interaction.guild.id}_${appNum}`;
        let data = applicationsData.get(key) || {};
        data.q1 = q1; data.q2 = q2; data.q3 = q3; data.q4 = q4; data.q5 = q5;
        applicationsData.set(key, data);

        return interaction.reply({ content: `✅ تم حفظ الأسئلة الخمسة للتقديم (${appNum}) بنجاح!`, ephemeral: true });
      }

      if (interaction.customId.startsWith('submit_apply_modal_')) {
        const appNum = interaction.customId.replace('submit_apply_modal_', '');
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`);
        
        const ans1 = interaction.fields.getTextInputValue('q_ans_1');
        const ans2 = interaction.fields.getTextInputValue('q_ans_2');
        const ans3 = interaction.fields.getTextInputValue('q_ans_3');
        const ans4 = interaction.fields.getTextInputValue('q_ans_4');
        const ans5 = interaction.fields.getTextInputValue('q_ans_5');

        if (!data || !data.logChannelId) {
          return interaction.reply({ content: '❌ عذراً، لم يتم تحديد روم وصول طلبات هذا التقديم من قبل الإدارة.', ephemeral: true });
        }

        const logChannel = interaction.guild.channels.cache.get(data.logChannelId);
        if (!logChannel) return interaction.reply({ content: '❌ روم استقبال الطلبات غير موجودة حالياً.', ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle(`📥 طلب تقديم جديد: ${data.name || 'تقديم'}`)
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            { name: `1️⃣ ${data.q1}:`, value: ans1, inline: false },
            { name: `2️⃣ ${data.q2}:`, value: ans2, inline: false },
            { name: `3️⃣ ${data.q3}:`, value: ans3, inline: false },
            { name: `4️⃣ ${data.q4 || 'السؤال الرابع'}:`, value: ans4, inline: false },
            { name: `5️⃣ ${data.q5 || 'السؤال الخامس'}:`, value: ans5, inline: false },
            { name: '👤 المتقدم:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
          )
          .setColor(0xE74C3C)
          .setTimestamp();

        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`app_accept_${appNum}_${interaction.user.id}`).setLabel('قبول الطلب').setEmoji('✅').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`app_reject_${appNum}_${interaction.user.id}`).setLabel('رفض الطلب').setEmoji('❌').setStyle(ButtonStyle.Danger)
        );

        await logChannel.send({ embeds: [embed], components: [actionRow] }).catch(() => {});
        return interaction.reply({ content: '✅ تم إرسال إجاباتك للإدارة بنجاح، بالتوفيق!', ephemeral: true });
      }
    }
  } catch (err) {
    console.error(err);
  }
});

// نظام الأذكار التلقائية (Interval)
setInterval(() => {
  azkarSettings.forEach(async (settings, guildId) => {
    const elapsed = Date.now() - settings.lastSent;
    const intervalMs = settings.intervalHours * 60 * 60 * 1000;
    if (elapsed >= intervalMs) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;
      const channel = guild.channels.cache.get(settings.channelId);
      if (!channel) return;

      const randomZikr = azkarList[Math.floor(Math.random() * azkarList.length)];
      const embed = new EmbedBuilder()
        .setTitle('📿 ذِكْرُ الله التلقائي')
        .setDescription(`> **${randomZikr}**`)
        .setColor(0xE74C3C)
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
      settings.lastSent = Date.now();
    }
  });
}, 60 * 1000);

// نظام حساب الـ XP واللفلات والكلمات الممنوعة ورصد الرسائل
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  // 1. نظام الكلمات الممنوعة (Bad Words Filter)
  const wordsSet = badWordsDB.get(message.guild.id);
  if (wordsSet && wordsSet.size > 0) {
    const contentLower = message.content.toLowerCase();
    let hasBadWord = false;
    for (const word of wordsSet) {
      if (contentLower.includes(word)) {
        hasBadWord = true;
        break;
      }
    }

    if (hasBadWord) {
      const punishment = badWordsPunishment.get(message.guild.id) || 'delete';
      await message.delete().catch(() => {});

      if (punishment === 'timeout') {
        await message.member.timeout(5 * 60 * 1000, 'استخدام كلمات محظورة').catch(() => {});
        message.channel.send(`⚠️ ${message.author}، تم كتمك لمدة 5 دقائق لاستخدامك كلمات ممنوعة.`).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
      } else if (punishment === 'kick') {
        await message.member.kick('استخدام كلمات محظورة').catch(() => {});
      } else if (punishment === 'ban') {
        await message.guild.members.ban(message.author.id, { reason: 'استخدام كلمات محظورة' }).catch(() => {});
      }
      return;
    }
  }

  // 2. نظام الـ AFK
  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);
    message.reply(`Welcome back ${message.author}! I have removed your AFK status.`).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
  }

  message.mentions.users.forEach(user => {
    if (afkUsers.has(user.id)) {
      const afkData = afkUsers.get(user.id);
      message.reply(`💤 العضو **${user.username}** غائب حالياً. السبب: ${afkData.reason} (<t:${Math.floor(afkData.timestamp / 1000)}:R>)`);
    }
  });

  // 3. نظام الاختصارات الإدارية (Custom Shortcuts مثل !b أو !k)
  if (message.content.startsWith('!')) {
    const args = message.content.slice(1).trim().split(/ +/);
    const alias = args[0].toLowerCase();
    const key = `${message.guild.id}_${alias}`;

    if (customShortcuts.has(key)) {
      const origCmd = customShortcuts.get(key);
      // محاكاة أو تشغيل الأوامر بناء على الاختصار
      if (origCmd === 'clear' && args[1]) {
        const count = parseInt(args[1]);
        if (!isNaN(count)) {
          await message.channel.bulkDelete(count, true).catch(() => {});
          return message.channel.send(`🧹 تم مسح **${count}** رسالة عبر الاختصار \`!${alias}\`.`).then(m => setTimeout(() => m.delete().catch(()=>{}), 4000));
        }
      }
    }
  }

  // 4. نظام اللفلات وتجميع النقاط (XP)
  const lvlSet = levelSettings.get(message.guild.id);
  if (lvlSet && lvlSet.enabled) {
    const key = `${message.guild.id}_${message.author.id}`;
    let userData = userLevels.get(key) || { xp: 0, level: 0 };
    
    userData.xp += (lvlSet.xpPerMessage || 15);
    const requiredXp = getRequiredXp(userData.level);

    if (userData.xp >= requiredXp) {
      userData.level += 1;
      userData.xp = 0;
      message.channel.send(`🎉 تهانينا ${message.author}! لقد صعدت إلى المستوى **${userData.level}** 🚀`).then(m => setTimeout(() => m.delete().catch(()=>{}), 6000));
    }
    userLevels.set(key, userData);
  }
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}! 🤖`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error(error);
  }
});

client.login(process.env.DISCORD_TOKEN);
